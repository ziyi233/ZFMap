import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const BASE_URL = 'https://pdrcgy.pudong.gov.cn'
const LIST_PAGE_URL = `${BASE_URL}/api/web/PL.html`
const LIST_API_URL = `${BASE_URL}/api/search/4haZfnhu2p8jrVZjL7K`
const DETAIL_PAGE_URL = (id) => `${BASE_URL}/api/web/PLD.html?id=${id}`
const DETAIL_API_URL = `${BASE_URL}/api/web/getProjectList.html`
const IMAGE_BASE_URL = `${BASE_URL}/file?op=2&bean=rcajImg&path=`
const OUTPUT_DIR = join(process.cwd(), 'data')

const defaultHeaders = {
  accept: 'application/json, text/javascript, */*; q=0.01',
  'x-requested-with': 'XMLHttpRequest',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
}

const splitCookies = (setCookieHeader) => {
  if (!setCookieHeader) return []
  return setCookieHeader
    .split(/,(?=[^;]+?=)/)
    .map((cookie) => cookie.split(';', 1)[0].trim())
    .filter(Boolean)
}

const extractCsrf = (html) => {
  const match = html.match(/meta name="_csrf" content="([^"]+)"/)
  if (!match) {
    throw new Error('Failed to extract CSRF token')
  }

  return match[1]
}

const createSession = async (url) => {
  const response = await fetch(url, {
    headers: {
      'user-agent': defaultHeaders['user-agent'],
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to open page ${url}: ${response.status}`)
  }

  const html = await response.text()
  const csrf = extractCsrf(html)
  const setCookie = response.headers.get('set-cookie')
  const cookie = splitCookies(setCookie).join('; ')

  return { csrf, cookie, html }
}

const postJson = async (url, { csrf, cookie, referer }, body) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...defaultHeaders,
      'content-type': 'application/json;charset=UTF-8',
      'x-csrf-token': csrf,
      origin: BASE_URL,
      referer,
      cookie,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Request failed ${url}: ${response.status}`)
  }

  return response.json()
}

const postEmpty = async (url, { csrf, cookie, referer }) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...defaultHeaders,
      'x-csrf-token': csrf,
      origin: BASE_URL,
      referer,
      cookie,
    },
  })

  if (!response.ok) {
    throw new Error(`Request failed ${url}: ${response.status}`)
  }

  return response.json()
}

const toImageUrls = (value) => {
  if (!value) return []
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((path) => `${IMAGE_BASE_URL}${encodeURIComponent(path).replace(/%2F/g, '/')}`)
}

const main = async () => {
  await mkdir(OUTPUT_DIR, { recursive: true })

  const listSession = await createSession(LIST_PAGE_URL)
  const listPayload = await postEmpty(
    LIST_API_URL,
    { csrf: listSession.csrf, cookie: listSession.cookie, referer: LIST_PAGE_URL },
  )

  if (!Array.isArray(listPayload.rows)) {
    throw new Error('Unexpected list payload shape')
  }

  const projects = []

  for (const row of listPayload.rows) {
    const detailPageUrl = DETAIL_PAGE_URL(row.projectId)
    const detailSession = await createSession(detailPageUrl)
    const detailPayload = await postJson(
      DETAIL_API_URL,
      {
        csrf: detailSession.csrf,
        cookie: detailSession.cookie,
        referer: detailPageUrl,
      },
      { id: String(row.projectId) },
    )

    const detail = Array.isArray(detailPayload) ? detailPayload[0] : null
    if (!detail) continue

    projects.push({
      ...detail,
      listName: row.villageProjectName,
      imageUrls: toImageUrls(detail.villagePhoto),
      floorplanUrls: toImageUrls(detail.hxt),
    })
  }

  const summary = projects.map((project) => ({
    projectId: project.projectId,
    villageProjectName: project.villageProjectName,
    location: project.location,
    x: project.x,
    y: project.y,
    price_range: project.price_range,
    jgqj: project.jgqj,
    streetOfficeName: project.streetOfficeName,
    zoneName: project.zoneName,
    metro_subway: project.metro_subway,
    imageCount: project.imageUrls.length,
    floorplanCount: project.floorplanUrls.length,
  }))

  await writeFile(join(OUTPUT_DIR, 'projects.list.json'), JSON.stringify(listPayload, null, 2))
  await writeFile(join(OUTPUT_DIR, 'projects.detail.json'), JSON.stringify(projects, null, 2))
  await writeFile(join(OUTPUT_DIR, 'projects.summary.json'), JSON.stringify(summary, null, 2))

  console.log(`Fetched ${projects.length} projects`) 
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
