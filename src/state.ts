export type IinaPlaybackState = {
	playback: 'playing' | 'paused' | 'idle'
	paused: boolean
	idle: boolean
	position: number | null
	duration: number | null
	remaining: number | null
	remainingSeconds: number | null
	playbackFinished: boolean
	progress: number | null
	speed: number
	volume: number
	muted: boolean
	title: string
	url: string
	fullscreen: boolean
	pip: boolean
	ontop: boolean
	playlistPosition: number
	playlistCount: number
	chapter: number
	chapterCount: number
	audioTrack: number | null
	videoTrack: number | null
	subtitleTrack: number | null
	secondSubtitleTrack: number | null
	audioDelay: number
	subtitleDelay: number
	subtitleVisible: boolean
	loopFile: string
	loopPlaylist: string
	endBehavior?: string
	playbackMode?: string
	filename?: string
	videoInfo?: string
	audioTracks?: Array<{ id: number; label: string; language?: string; codec?: string }>
	subtitleTracks?: Array<{ id: number; label: string; language?: string; codec?: string }>
	playlistItems?: Array<{ id: number; label: string; filename?: string; url?: string }>
	chapters?: Array<{ id: number; title: string; time: number }>
	screens?: Array<{ id: number; label: string }>
	timestamp: number
}

export const EmptyState: IinaPlaybackState = {
	playback: 'idle',
	paused: true,
	idle: true,
	position: null,
	duration: null,
	remaining: null,
	remainingSeconds: null,
	playbackFinished: false,
	progress: null,
	speed: 1,
	volume: 0,
	muted: false,
	title: '',
	url: '',
	fullscreen: false,
	pip: false,
	ontop: false,
	playlistPosition: -1,
	playlistCount: 0,
	chapter: -1,
	chapterCount: 0,
	audioTrack: null,
	videoTrack: null,
	subtitleTrack: null,
	secondSubtitleTrack: null,
	audioDelay: 0,
	subtitleDelay: 0,
	subtitleVisible: true,
	loopFile: 'no',
	loopPlaylist: 'no',
	timestamp: 0,
}

export function formatTime(value: number | null): string {
	if (value === null || !Number.isFinite(value)) return '--:--'
	const total = Math.max(0, Math.floor(value))
	const hours = Math.floor(total / 3600)
	const minutes = Math.floor((total % 3600) / 60)
	const seconds = total % 60
	return hours > 0
		? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
		: `${minutes}:${String(seconds).padStart(2, '0')}`
}
