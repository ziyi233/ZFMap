import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Info,
  KeyRound,
  Map as MapIcon,
  MapPin,
  Navigation,
  Phone,
  Search,
  Settings,
  X,
} from 'lucide-react'
import projectsJson from '../data/projects.detail.json'

declare global {
  interface Window {
    AMap?: any
    _AMapSecurityConfig?: {
      securityJsCode: string
    }
  }
}

type AMapConfig = {
  apiKey: string
  securityCode: string
}

type KeyMode = 'public' | 'custom'

type Location = {
  lat: number
  lng: number
  address: string
}

type SearchSuggestion = {
  id: string
  name: string
  address: string
  district?: string
  lat: number
  lng: number
}

type Project = {
  rzzg?: string
  globaltype2Name?: string
  releaseTime?: string
  yykf?: string
  villageProjectName: string
  ptsszynr?: string
  companyName?: string
  price_range?: string
  fhxjgqj?: string
  projectStatusName?: string
  zoneName?: string
  operateName?: string
  streetOfficeName?: string
  lxdh?: string
  jgqj?: string
  x: number
  y: number
  location: string
  projectId: number
  listName?: string
  metro_subway?: string
  imageUrls?: string[]
  floorplanUrls?: string[]
  distanceToCompany?: number
}

type GalleryType = 'images' | 'floorplans'

type ImagePreview = {
  project: Project
  galleryType: GalleryType
  index: number
}

const AMAP_KEY = import.meta.env.VITE_AMAP_KEY as string | undefined
const AMAP_SECURITY_CODE = import.meta.env.VITE_AMAP_SECURITY_CODE as string | undefined
const COMPANY_LOCATION_KEY = 'company_location'
const SHOW_MARKER_LABELS_KEY = 'show_marker_labels'
const MOBILE_BREAKPOINT = 768
const MOBILE_COLLAPSED_HEIGHT = 88
const rawData = projectsJson as Project[]

function getStoredCompanyLocation() {
  try {
    const value = localStorage.getItem(COMPANY_LOCATION_KEY)
    if (!value) return null
    const location = JSON.parse(value) as Location
    if (typeof location.lat !== 'number' || typeof location.lng !== 'number') return null
    return location
  } catch {
    return null
  }
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radius = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return radius * c
}

function getProjectName(project: Project) {
  return project.listName || project.villageProjectName
}

function getMainImage(project: Project) {
  return project.imageUrls?.[0]
}

function getGalleryImages(project: Project, galleryType: GalleryType) {
  return galleryType === 'images' ? project.imageUrls || [] : project.floorplanUrls || []
}

function KeyModeScreen({ onSelect }: { onSelect: (mode: KeyMode) => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-xl md:p-8">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-blue-100 p-3 text-blue-600">
            <MapIcon size={32} />
          </div>
        </div>
        <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">选择地图 Key 使用方式</h2>
        <p className="mx-auto mb-6 max-w-lg text-center text-sm leading-relaxed text-gray-500">
          公益 Key 用于公共访问，已在高德控制台启用域名白名单，只允许本站域名调用；如果你希望使用自己的额度，也可以填写自己的 Web端 JS API Key
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <button
            type="button"
            disabled={!AMAP_KEY}
            onClick={() => onSelect('public')}
            className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-left transition hover:border-blue-300 hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:opacity-60"
          >
            <div className="mb-3 inline-flex rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
              推荐
            </div>
            <h3 className="mb-2 text-lg font-bold text-gray-900">使用公益 Key</h3>
            <p className="text-sm leading-relaxed text-gray-600">
              直接进入地图。公益 Key 已配置域名白名单，适合普通访问和部署后的公共服务
            </p>
            {!AMAP_KEY && (
              <p className="mt-3 text-xs font-medium text-red-500">
                当前部署环境没有配置 VITE_AMAP_KEY，暂不可用
              </p>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelect('custom')}
            className="rounded-2xl border border-gray-200 bg-white p-5 text-left transition hover:border-gray-300 hover:bg-gray-50"
          >
            <div className="mb-3 inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
              自定义
            </div>
            <h3 className="mb-2 text-lg font-bold text-gray-900">使用自己的 Key</h3>
            <p className="text-sm leading-relaxed text-gray-600">
              填写你自己的高德 Web端 JS API Key 和安全密钥，额度和域名白名单由你自己控制
            </p>
          </button>
        </div>
      </div>
    </div>
  )
}

function AMapConfigScreen({
  onBack,
  onConfigSubmit,
}: {
  onBack: () => void
  onConfigSubmit: (config: AMapConfig) => void
}) {
  const [apiKey, setApiKey] = useState(localStorage.getItem('amap_key') || '')
  const [securityCode, setSecurityCode] = useState(
    localStorage.getItem('amap_security_code') || '',
  )

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!apiKey.trim()) return
    localStorage.setItem('amap_key', apiKey.trim())
    localStorage.setItem('amap_security_code', securityCode.trim())
    onConfigSubmit({ apiKey: apiKey.trim(), securityCode: securityCode.trim() })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-blue-100 p-3 text-blue-600">
            <MapIcon size={32} />
          </div>
        </div>
        <h2 className="mb-2 text-center text-2xl font-bold text-gray-800">配置自己的高德地图 Key</h2>
        <p className="mb-8 text-center text-sm text-gray-500">
          填入 Web端 JS API Key 后加载地图和地址解析
        </p>

        <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div>
            <strong className="mb-1 block">避免 USERKEY_PLAT_NOMATCH：</strong>
            请确认 Key 类型是 <b>Web端 JS API</b>。本地开发需要在高德控制台放行
            <b> localhost</b>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Web端 JS API Key <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                required
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="请输入高德地图 Key"
                className="w-full rounded-lg border border-gray-300 p-3 pl-10 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Web端安全密钥 Security Code
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                value={securityCode}
                onChange={(event) => setSecurityCode(event.target.value)}
                placeholder="地址解析通常需要，可先不填"
                className="w-full rounded-lg border border-gray-300 p-3 pl-10 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700">
            进入系统
          </button>
          <button
            type="button"
            onClick={onBack}
            className="w-full rounded-lg border border-gray-200 bg-white py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            返回选择公益 Key
          </button>
        </form>
      </div>
    </div>
  )
}

export default function App() {
  const [keyMode, setKeyMode] = useState<KeyMode | null>(null)
  const [config, setConfig] = useState<AMapConfig | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [companyLocation, setCompanyLocation] = useState<Location | null>(() =>
    getStoredCompanyLocation(),
  )
  const [searchQuery, setSearchQuery] = useState(() => getStoredCompanyLocation()?.address || '')
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([])
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<Project | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [galleryType, setGalleryType] = useState<GalleryType>('images')
  const [imagePreview, setImagePreview] = useState<ImagePreview | null>(null)
  const [showMarkerLabels, setShowMarkerLabels] = useState(
    () => localStorage.getItem(SHOW_MARKER_LABELS_KEY) !== 'false',
  )
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT)
  const [isMobileSidebarExpanded, setIsMobileSidebarExpanded] = useState(
    () => window.innerWidth >= MOBILE_BREAKPOINT,
  )

  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const companyMarkerRef = useRef<any>(null)
  const autoCompleteServiceRef = useRef<any>(null)
  const searchRequestIdRef = useRef(0)

  const displayProperties = useMemo(() => {
    if (!companyLocation) return rawData
    return [...rawData]
      .map((project) => ({
        ...project,
        distanceToCompany: getDistance(companyLocation.lat, companyLocation.lng, project.y, project.x),
      }))
      .sort((a, b) => (a.distanceToCompany ?? 0) - (b.distanceToCompany ?? 0))
  }, [companyLocation])

  useEffect(() => {
    const handleResize = () => {
      const nextIsMobile = window.innerWidth < MOBILE_BREAKPOINT
      setIsMobile(nextIsMobile)
      if (!nextIsMobile) {
        setIsMobileSidebarExpanded(true)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!keyMode) return

    if (keyMode === 'public' && AMAP_KEY) {
      setMapLoaded(false)
      setConfig({ apiKey: AMAP_KEY, securityCode: AMAP_SECURITY_CODE || '' })
      return
    }

    if (keyMode === 'public' && !AMAP_KEY) {
      setConfig(null)
      return
    }

    if (keyMode !== 'custom') return

    const savedKey = localStorage.getItem('amap_key')
    const savedCode = localStorage.getItem('amap_security_code')
    if (savedKey) {
      setMapLoaded(false)
      setConfig({ apiKey: savedKey, securityCode: savedCode || '' })
    } else {
      setConfig(null)
    }
  }, [keyMode])

  useEffect(() => {
    if (!config || mapLoaded) return
    if (config.securityCode) {
      window._AMapSecurityConfig = { securityJsCode: config.securityCode }
    }

    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${config.apiKey}&plugin=AMap.AutoComplete`
    script.async = true
    script.onload = () => setMapLoaded(true)
    script.onerror = () => {
      alert('地图加载失败，请检查 Key 类型、域名白名单和安全密钥')
      localStorage.removeItem('amap_key')
      localStorage.removeItem('amap_security_code')
      setConfig(null)
      setKeyMode(null)
    }
    document.body.appendChild(script)

    return () => {
      script.remove()
    }
  }, [config, mapLoaded])

  useEffect(() => {
    if (!mapLoaded || !window.AMap || !mapContainerRef.current || mapInstanceRef.current) return

    mapInstanceRef.current = new window.AMap.Map(mapContainerRef.current, {
      zoom: 11,
      center: [121.609043, 31.134557],
      viewMode: '2D',
    })
  }, [mapLoaded])

  useEffect(() => {
    if (!companyLocation) return
    localStorage.setItem(COMPANY_LOCATION_KEY, JSON.stringify(companyLocation))
  }, [companyLocation])

  useEffect(() => {
    localStorage.setItem(SHOW_MARKER_LABELS_KEY, String(showMarkerLabels))
  }, [showMarkerLabels])

  useEffect(() => {
    if (!mapLoaded || !companyLocation) return
    updateCompanyMarker(companyLocation)
  }, [companyLocation, mapLoaded])

  useEffect(() => {
    mapInstanceRef.current?.resize?.()
  }, [isMobileSidebarExpanded])

  useEffect(() => {
    if (!mapLoaded || !window.AMap) return

    window.AMap.plugin('AMap.AutoComplete', () => {
      autoCompleteServiceRef.current = new window.AMap.AutoComplete({ city: '上海' })
    })
  }, [mapLoaded])

  useEffect(() => {
    if (!mapLoaded || !autoCompleteServiceRef.current || !isSearchFocused) return

    const keyword = searchQuery.trim()
    if (!keyword || keyword === companyLocation?.address) {
      setSearchSuggestions([])
      return
    }

    const requestId = searchRequestIdRef.current + 1
    searchRequestIdRef.current = requestId

    autoCompleteServiceRef.current.search(keyword, (status: string, result: any) => {
      if (requestId !== searchRequestIdRef.current) return
      if (status !== 'complete' || !Array.isArray(result.tips)) {
        setSearchSuggestions([])
        return
      }

      const suggestions = result.tips
        .filter((tip: any) => tip.location && typeof tip.location.lng === 'number')
        .slice(0, 8)
        .map((tip: any, index: number) => ({
          id: `${tip.id || tip.name}-${index}`,
          name: tip.name,
          address: tip.address || tip.district || '上海',
          district: tip.district,
          lat: tip.location.lat,
          lng: tip.location.lng,
        }))

      setSearchSuggestions(suggestions)
    })
  }, [companyLocation?.address, isSearchFocused, mapLoaded, searchQuery])

  useEffect(() => {
    if (!mapLoaded || !window.AMap || !mapInstanceRef.current) return

    mapInstanceRef.current.remove(markersRef.current)
    markersRef.current = []

    displayProperties.forEach((project, index) => {
      const isTop3 = Boolean(companyLocation && index < 3)
      const isSelected = selectedProperty?.projectId === project.projectId
      const content = document.createElement('div')
      content.className = 'marker-content group cursor-pointer'

      const pinColor = isSelected
        ? 'bg-blue-600 border-blue-200'
        : isTop3
          ? 'bg-orange-500 border-orange-200'
          : 'bg-white border-blue-400'
      const iconColor = isSelected || isTop3 ? 'text-white' : 'text-blue-500'
      const priceText = project.jgqj ? project.jgqj.replace('元', '') : '暂无报价'

      content.innerHTML = `
        <div class="marker-pin w-8 h-8 rounded-full border-[3px] shadow-md flex items-center justify-center transition-transform duration-300 ${isSelected ? 'scale-125 z-50 shadow-xl' : 'hover:scale-110'} ${pinColor}">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="${iconColor}">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </div>
        <div class="marker-label${showMarkerLabels ? ' is-visible' : ''} absolute bottom-full left-1/2 -translate-x-1/2 mb-2 transition-opacity duration-200 pointer-events-none z-[100] min-w-max">
          <div class="bg-gray-800/90 text-white text-xs font-medium px-3 py-2 rounded-lg shadow-xl whitespace-nowrap flex flex-col items-center backdrop-blur">
            <span class="block mb-1 text-[13px]">${getProjectName(project)}</span>
            <span class="text-orange-300 font-bold">¥ ${priceText}</span>
            <div class="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-gray-800"></div>
          </div>
        </div>
      `

      content.onclick = () => {
        setSelectedProperty(project)
        setCurrentImageIndex(0)
        setGalleryType('images')
        mapInstanceRef.current.panTo([project.x, project.y])
      }

      const marker = new window.AMap.Marker({
        position: new window.AMap.LngLat(project.x, project.y),
        content,
        offset: new window.AMap.Pixel(-16, -16),
        zIndex: isSelected ? 100 : isTop3 ? 50 : 10,
      })

      marker.on('mouseover', () => marker.setTop(true))
      marker.on('mouseout', () => marker.setTop(false))
      marker.setMap(mapInstanceRef.current)
      markersRef.current.push(marker)
    })
  }, [companyLocation, displayProperties, mapLoaded, selectedProperty])

  useEffect(() => {
    document.querySelectorAll('.marker-label').forEach((element) => {
      element.classList.toggle('is-visible', showMarkerLabels)
    })
  }, [showMarkerLabels])

  const updateCompanyMarker = (location: Location) => {
    if (!mapInstanceRef.current || !window.AMap) return

    if (companyMarkerRef.current) {
      companyMarkerRef.current.setMap(null)
    }

    const content = document.createElement('div')
    content.innerHTML = `
      <div class="bg-indigo-600 text-white p-2 rounded-full shadow-2xl border-[3px] border-white flex items-center justify-center animate-bounce">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>
        </svg>
      </div>
    `

    companyMarkerRef.current = new window.AMap.Marker({
      position: [location.lng, location.lat],
      content,
      offset: new window.AMap.Pixel(-20, -20),
      zIndex: 1000,
    })
    companyMarkerRef.current.setMap(mapInstanceRef.current)
    mapInstanceRef.current.setCenter([location.lng, location.lat])
    mapInstanceRef.current.setZoom(13)
  }

  const selectSearchSuggestion = (suggestion: SearchSuggestion) => {
    const location = {
      lat: suggestion.lat,
      lng: suggestion.lng,
      address: `${suggestion.name}${suggestion.address ? ` · ${suggestion.address}` : ''}`,
    }
    setCompanyLocation(location)
    setSearchQuery(location.address)
    setSearchSuggestions([])
    setIsSearchFocused(false)
    updateCompanyMarker(location)
  }

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (searchSuggestions[0]) {
      selectSearchSuggestion(searchSuggestions[0])
    }
  }

  const resetConfig = () => {
    localStorage.removeItem('amap_key')
    localStorage.removeItem('amap_security_code')
    window.location.reload()
  }

  const openImagePreview = (project: Project, index = currentImageIndex) => {
    setImagePreview({ project, galleryType, index })
  }

  const moveImagePreview = (direction: -1 | 1) => {
    setImagePreview((preview) => {
      if (!preview) return preview
      const images = getGalleryImages(preview.project, preview.galleryType)
      if (images.length === 0) return preview
      return {
        ...preview,
        index: (preview.index + direction + images.length) % images.length,
      }
    })
  }

  if (!keyMode) {
    return (
      <KeyModeScreen
        onSelect={(mode) => {
          setKeyMode(mode)
          if (mode === 'public' && AMAP_KEY) {
            setMapLoaded(false)
            setConfig({ apiKey: AMAP_KEY, securityCode: AMAP_SECURITY_CODE || '' })
          }
        }}
      />
    )
  }

  if (!config) {
    return (
      <AMapConfigScreen
        onBack={() => {
          setKeyMode(null)
          setConfig(null)
        }}
        onConfigSubmit={(nextConfig) => {
          setKeyMode('custom')
          setMapLoaded(false)
          setConfig(nextConfig)
        }}
      />
    )
  }

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-gray-50 font-sans text-gray-800 md:flex-row">
      <div
        className="relative z-20 flex w-full shrink-0 flex-col bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)] md:h-auto md:w-[420px] md:shadow-[4px_0_24px_rgba(0,0,0,0.05)]"
        style={{
          height: isMobile
            ? `${isMobileSidebarExpanded ? window.innerHeight : MOBILE_COLLAPSED_HEIGHT}px`
            : undefined,
        }}
      >
        <div className="border-b border-gray-100 bg-white p-4 md:p-6">
          <div className="mb-3 flex items-center justify-between md:mb-4">
            <h1 className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-lg font-bold text-transparent md:text-xl">
              浦东新区低租金青年公寓
            </h1>
            <div className="flex items-center gap-2">
              {isMobile && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileSidebarExpanded((value) => !value)
                  }}
                  className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600"
                >
                  {isMobileSidebarExpanded ? '收起' : '展开'}
                </button>
              )}
              <button onClick={resetConfig} className="text-gray-400 hover:text-gray-600" title="重新配置高德 Key">
                <Settings size={18} />
              </button>
            </div>
          </div>

          {(!isMobile || isMobileSidebarExpanded) && (
            <>
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  id="search-input-amap"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value)
                    setIsSearchFocused(true)
                  }}
                  onFocus={() => setIsSearchFocused(true)}
                  placeholder="输入办公地点后选择候选项"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="off"
                />
                <Search className="absolute left-3 top-3.5 text-gray-400" size={16} />
                {searchSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl">
                    {searchSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectSearchSuggestion(suggestion)}
                        className="block w-full border-b border-gray-50 px-4 py-3 text-left transition last:border-b-0 hover:bg-blue-50"
                      >
                        <span className="block text-sm font-semibold text-gray-900">{suggestion.name}</span>
                        <span className="mt-0.5 block truncate text-xs text-gray-500">
                          {suggestion.district ? `${suggestion.district} · ` : ''}{suggestion.address}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </form>

              {companyLocation && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-indigo-100 bg-indigo-50 p-2.5 md:mt-4 md:p-3">
                  <MapPin className="mt-0.5 shrink-0 text-indigo-600" size={16} />
                  <div className="text-xs text-indigo-900">
                    <span className="mb-0.5 block font-semibold">办公地点已设定：</span>
                    <span className="text-indigo-700 opacity-80">{companyLocation.address}</span>
                  </div>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 md:mt-4">
                <span className="text-xs font-medium text-gray-600">地图标点文字</span>
                <button
                  type="button"
                  onClick={() => setShowMarkerLabels((value) => !value)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${showMarkerLabels ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 shadow-sm'}`}
                >
                  {showMarkerLabels ? '显示中' : '已隐藏'}
                </button>
              </div>
            </>
          )}

          {isMobile && !isMobileSidebarExpanded && (
            <p className="mt-2 text-xs text-gray-500">展开后可搜索办公地点并查看完整项目列表</p>
          )}
        </div>

        {(!isMobile || isMobileSidebarExpanded) && (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50/50 p-3 md:space-y-4 md:p-4">
              <div className="flex justify-between gap-3 px-2 pb-1 text-xs font-medium text-gray-500">
                <span>共找到 {displayProperties.length} 个低租金青年公寓项目</span>
                {companyLocation && <span>按距离由近及远排序</span>}
              </div>

              {displayProperties.map((project) => (
                <div
                  key={project.projectId}
                  onClick={() => {
                    setSelectedProperty(project)
                    setCurrentImageIndex(0)
                    setGalleryType('images')
                    mapInstanceRef.current?.panTo([project.x, project.y])
                  }}
                  className={`group cursor-pointer rounded-xl border-2 bg-white p-3 transition-all hover:border-blue-200 hover:shadow-lg md:p-4 ${
                    selectedProperty?.projectId === project.projectId
                      ? 'border-blue-500 shadow-md'
                      : 'border-transparent shadow-sm'
                  }`}
                >
                  <div className="flex gap-3 md:gap-4">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100 md:h-24 md:w-24">
                      {getMainImage(project) ? (
                        <img
                          src={getMainImage(project)}
                          alt={getProjectName(project)}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-300">
                          <ImageIcon size={24} />
                        </div>
                      )}
                      {companyLocation && project.distanceToCompany !== undefined && (
                        <div className="absolute left-0 top-0 rounded-br-lg bg-orange-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur">
                          {project.distanceToCompany < 1
                            ? '<1 km'
                            : `${project.distanceToCompany.toFixed(1)} km`}
                        </div>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                      <div>
                        <h3 className="truncate pr-2 text-base font-bold text-gray-900" title={getProjectName(project)}>
                          {getProjectName(project)}
                        </h3>
                        <div className="mt-1 flex items-center gap-1 truncate text-xs text-gray-500">
                          <MapPin size={12} className="shrink-0" />
                          <span className="truncate">
                            {project.streetOfficeName} | {project.zoneName}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {project.globaltype2Name && (
                          <span className="rounded border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] text-blue-600">
                            {project.globaltype2Name}
                          </span>
                        )}
                        {project.projectStatusName && (
                          <span className="rounded border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-600">
                            {project.projectStatusName}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 text-sm font-bold text-red-500">{project.jgqj || '暂无报价'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </>
        )}
      </div>

      <div className="relative min-h-0 flex-1 bg-gray-200">
        {!mapLoaded && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100">
            <div className="flex flex-col items-center text-gray-500">
              <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
              地图加载中...
            </div>
          </div>
        )}
        <div ref={mapContainerRef} className="h-full w-full" />

        {selectedProperty && (
          <div className="absolute inset-x-2 bottom-2 top-auto z-30 flex max-h-[88dvh] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.18)] md:inset-y-4 md:left-auto md:right-4 md:w-[400px] md:max-h-none">
            <button
              onClick={() => setSelectedProperty(null)}
              className="absolute right-4 top-4 z-40 rounded-full bg-black/40 p-1.5 text-white backdrop-blur transition hover:bg-black/60"
            >
              <X size={18} />
            </button>

            <div className="group relative h-48 shrink-0 bg-gray-100 md:h-56">
              {getGalleryImages(selectedProperty, galleryType).length ? (
                <>
                  <img
                    src={getGalleryImages(selectedProperty, galleryType)[currentImageIndex]}
                    alt={getProjectName(selectedProperty)}
                    onClick={() => openImagePreview(selectedProperty)}
                    className={`h-full w-full cursor-zoom-in ${galleryType === 'images' ? 'object-cover' : 'object-contain bg-white'}`}
                  />
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-2 py-0.5 text-[10px] text-white backdrop-blur">
                    {galleryType === 'images' ? '实景/外观' : '房型/户型'} {currentImageIndex + 1} / {getGalleryImages(selectedProperty, galleryType).length}
                  </div>
                  {getGalleryImages(selectedProperty, galleryType).length > 1 && (
                    <>
                      <button
                        onClick={() =>
                          setCurrentImageIndex((value) =>
                            value === 0
                              ? getGalleryImages(selectedProperty, galleryType).length - 1
                              : value - 1,
                          )
                        }
                        className="absolute left-2 top-1/2 rounded-full bg-black/30 p-1 text-white opacity-0 backdrop-blur transition hover:bg-black/60 group-hover:opacity-100"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button
                        onClick={() =>
                          setCurrentImageIndex((value) =>
                            value === getGalleryImages(selectedProperty, galleryType).length - 1
                              ? 0
                              : value + 1,
                          )
                        }
                        className="absolute right-2 top-1/2 rounded-full bg-black/30 p-1 text-white opacity-0 backdrop-blur transition hover:bg-black/60 group-hover:opacity-100"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-gray-400">
                  <ImageIcon size={32} />
                  <span className="text-sm">暂无图片</span>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-4 md:space-y-6 md:p-6">
              <div>
                <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
                  <button
                    onClick={() => {
                      setGalleryType('images')
                      setCurrentImageIndex(0)
                    }}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${galleryType === 'images' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    实景/外观 {selectedProperty.imageUrls?.length || 0}
                  </button>
                  <button
                    onClick={() => {
                      setGalleryType('floorplans')
                      setCurrentImageIndex(0)
                    }}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${galleryType === 'floorplans' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    房型/户型 {selectedProperty.floorplanUrls?.length || 0}
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {getGalleryImages(selectedProperty, galleryType).slice(0, 10).map((url, index) => (
                    <button
                      key={`${galleryType}-${url}`}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`h-14 overflow-hidden rounded-lg border-2 bg-gray-100 transition ${index === currentImageIndex ? 'border-blue-500' : 'border-transparent hover:border-blue-200'}`}
                    >
                      <img
                        src={url}
                        alt=""
                        className={`h-full w-full ${galleryType === 'images' ? 'object-cover' : 'object-contain bg-white'}`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="mb-2 text-xl font-bold text-gray-900 md:text-2xl">{getProjectName(selectedProperty)}</h2>
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
                    {selectedProperty.globaltype2Name || '保障性租赁住房'}
                  </span>
                  <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                    {selectedProperty.zoneName || '浦东新区'}
                  </span>
                </div>
                <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-red-600">
                  <div className="mb-1 text-xs font-medium opacity-80">租金区间</div>
                  <div className="text-lg font-bold md:text-xl">{selectedProperty.jgqj || '具体咨询运营方'}</div>
                </div>
              </div>

              <InfoRow icon={<Navigation size={18} />} label="详细地址">
                <div>{selectedProperty.location}</div>
                {selectedProperty.metro_subway && selectedProperty.metro_subway !== '/' && (
                  <div className="mt-1 inline-block rounded bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600">
                    地铁 {selectedProperty.metro_subway}
                  </div>
                )}
              </InfoRow>

              <InfoRow icon={<CheckCircle2 size={18} />} label="入住资格要求">
                {selectedProperty.rzzg || '无特殊限制'}
              </InfoRow>

              <InfoRow icon={<Phone size={18} />} label="联系电话">
                <span className="font-medium text-gray-900">{selectedProperty.lxdh || '暂无'}</span>
              </InfoRow>

              <InfoRow icon={<Building2 size={18} />} label="运营企业">
                {selectedProperty.operateName || selectedProperty.companyName || '暂无'}
              </InfoRow>

              <div>
                <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-900">
                  <Info size={18} className="text-blue-500" /> 社区与周边配套
                </h3>
                <div className="whitespace-pre-line rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm leading-relaxed text-gray-600">
                  {selectedProperty.ptsszynr || '暂无配套信息描述'}
                </div>
              </div>

              {selectedProperty.fhxjgqj && (
                <div>
                  <h3 className="mb-3 text-base font-bold text-gray-900">户型与价格明细</h3>
                  <div className="space-y-2">
                    {selectedProperty.fhxjgqj.split(',').map((item) => {
                      const [type, price] = item.split('：')
                      if (!type || !price) return null
                      return (
                        <div key={item} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                          <span className="text-sm font-medium text-gray-700">{type}</span>
                          <span className="text-sm font-bold text-red-500">{price}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {imagePreview && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4 md:p-6">
            <button
              onClick={() => setImagePreview(null)}
              className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white backdrop-blur transition hover:bg-white/20"
              aria-label="关闭图片预览"
            >
              <X size={24} />
            </button>

            <div className="absolute left-4 top-5 max-w-[70vw] text-white md:left-6">
              <div className="text-sm font-semibold">{getProjectName(imagePreview.project)}</div>
              <div className="mt-1 text-xs text-white/70">
                {imagePreview.galleryType === 'images' ? '实景/外观' : '房型/户型'} {imagePreview.index + 1} / {getGalleryImages(imagePreview.project, imagePreview.galleryType).length}
              </div>
            </div>

            {getGalleryImages(imagePreview.project, imagePreview.galleryType).length > 1 && (
              <>
                <button
                  onClick={() => moveImagePreview(-1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white backdrop-blur transition hover:bg-white/20 md:left-5 md:p-3"
                  aria-label="上一张"
                >
                  <ChevronLeft size={30} />
                </button>
                <button
                  onClick={() => moveImagePreview(1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white backdrop-blur transition hover:bg-white/20 md:right-5 md:p-3"
                  aria-label="下一张"
                >
                  <ChevronRight size={30} />
                </button>
              </>
            )}

            <img
              src={getGalleryImages(imagePreview.project, imagePreview.galleryType)[imagePreview.index]}
              alt={getProjectName(imagePreview.project)}
              className="max-h-[84dvh] max-w-[94vw] rounded-xl object-contain shadow-2xl md:max-h-[86vh] md:max-w-[92vw]"
            />
          </div>
        )}
      </div>
    </div>
  )
}

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0 text-gray-400">{icon}</div>
      <div>
        <div className="mb-0.5 text-xs text-gray-500">{label}</div>
        <div className="text-sm leading-relaxed text-gray-800">{children}</div>
      </div>
    </div>
  )
}
