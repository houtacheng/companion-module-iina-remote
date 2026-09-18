import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import WebSocket, { type RawData } from 'ws'
import { GetConfigFields, type ModuleConfig, type ModuleSecrets } from './config.js'
import { UpdateVariableDefinitions, type VariablesSchema } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions, type ActionsSchema } from './actions.js'
import { UpdateFeedbacks, type FeedbacksSchema } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import { EmptyState, formatTime, type IinaPlaybackState } from './state.js'

export type ModuleSchema = {
	config: ModuleConfig
	secrets: ModuleSecrets
	actions: ActionsSchema
	feedbacks: FeedbacksSchema
	variables: VariablesSchema
}

type IncomingMessage = {
	type?: string
	requestId?: string | null
	ok?: boolean
	error?: string | { message?: string }
	state?: IinaPlaybackState | null
	folder?: string
	files?: unknown
	players?: unknown
	playerId?: string | null
}

export type MediaFile = { label: string; path: string }
export type PlayerWindow = { id: string; label: string; state?: IinaPlaybackState }

export { UpgradeScripts }

export default class ModuleInstance extends InstanceBase<ModuleSchema> {
	config!: ModuleConfig
	secrets!: ModuleSecrets
	state: IinaPlaybackState = { ...EmptyState }
	authenticated = false
	mediaFiles: MediaFile[] = []
	mediaFolder = ''
	playerWindows: PlayerWindow[] = []
	activePlayerId = ''

	private socket?: WebSocket
	private reconnectTimer?: NodeJS.Timeout
	private connectionTimer?: NodeJS.Timeout
	private heartbeatTimer?: NodeJS.Timeout
	private lastMessageAt = 0
	private destroyed = false
	private requestCounter = 0
	private readonly heartbeatIntervalMs = 5000
	private readonly heartbeatTimeoutMs = 15000
	private readonly connectionTimeoutMs = 10000

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig, _isFirstInit: boolean, secrets: ModuleSecrets): Promise<void> {
		this.config = config
		this.secrets = secrets
		this.destroyed = false
		this.updateActions()
		this.updateFeedbacks()
		this.updatePresets()
		this.updateVariableDefinitions()
		this.setVariableValues({ media_folder: '', media_file_count: 0, active_player_id: '', player_window_count: 0 })
		this.publishState()
		this.connect()
	}

	async destroy(): Promise<void> {
		this.destroyed = true
		this.clearReconnect()
		this.clearHealthTimers()
		this.closeSocket()
	}

	async configUpdated(config: ModuleConfig, secrets: ModuleSecrets): Promise<void> {
		this.config = config
		this.secrets = secrets
		this.connect()
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	private buildUrl(): string {
		let host = String(this.config.host || '').trim()
		host = host.replace(/^wss?:\/\//i, '').replace(/\/.*$/, '')
		if (host.startsWith('[')) {
			const closing = host.indexOf(']')
			if (closing > 0) host = host.slice(1, closing)
		} else if (/^[^:]+:\d+$/.test(host)) {
			host = host.replace(/:\d+$/, '')
		}
		if (!host) throw new Error('請輸入 IINA 主機位址')
		const port = Number(this.config.port || 19190)
		if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('連接埠不正確')
		return `ws://${host.includes(':') ? `[${host}]` : host}:${port}`
	}

	private connect(): void {
		this.clearReconnect()
		this.closeSocket()
		this.authenticated = false
		this.publishConnection('connecting')

		if (!String(this.secrets?.token || '').trim()) {
			this.updateStatus(InstanceStatus.BadConfig, '請輸入 IINA 外掛的配對金鑰')
			this.publishConnection('missing_token')
			return
		}

		let url: string
		try {
			url = this.buildUrl()
		} catch (error) {
			this.updateStatus(InstanceStatus.BadConfig, String(error))
			this.publishConnection('bad_config')
			return
		}

		this.updateStatus(InstanceStatus.Connecting)
		this.log('debug', `Connecting to ${url}`)
		const socket = new WebSocket(url, { handshakeTimeout: this.connectionTimeoutMs })
		this.socket = socket

		socket.on('open', () => {
			if (socket !== this.socket) return
			this.lastMessageAt = Date.now()
			this.connectionTimer = setTimeout(() => {
				if (socket !== this.socket || this.authenticated) return
				this.log('warn', 'IINA 連線驗證逾時，將自動重新連線')
				socket.terminate()
			}, this.connectionTimeoutMs)
			this.sendRaw({
				type: 'auth',
				token: this.secrets.token,
				requestId: this.nextRequestId('auth'),
			})
		})

		socket.on('message', (data: RawData) => {
			if (socket !== this.socket) return
			this.handleMessage(data)
		})
		socket.on('error', (error) => {
			if (socket !== this.socket) return
			this.log('warn', `WebSocket error: ${error.message}`)
			try {
				socket.terminate()
			} catch (_error) {
				// The close handler will reconnect when possible.
			}
		})
		socket.on('close', () => {
			if (socket !== this.socket) return
			this.socket = undefined
			this.clearHealthTimers()
			this.authenticated = false
			this.updateStatus(InstanceStatus.ConnectionFailure, 'IINA 連線中斷')
			this.publishConnection('disconnected')
			if (!this.destroyed) {
				this.reconnectTimer = setTimeout(() => this.connect(), 3000)
			}
		})
	}

	private closeSocket(): void {
		this.clearHealthTimers()
		const socket = this.socket
		this.socket = undefined
		if (socket) {
			socket.removeAllListeners()
			try {
				socket.close()
			} catch (_error) {
				// Socket may not have completed its handshake yet.
			}
		}
	}

	private clearReconnect(): void {
		if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
		this.reconnectTimer = undefined
	}

	private clearHealthTimers(): void {
		if (this.connectionTimer) clearTimeout(this.connectionTimer)
		if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
		this.connectionTimer = undefined
		this.heartbeatTimer = undefined
	}

	private startHeartbeat(): void {
		if (this.connectionTimer) clearTimeout(this.connectionTimer)
		this.connectionTimer = undefined
		if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
		this.lastMessageAt = Date.now()
		this.heartbeatTimer = setInterval(() => {
			const socket = this.socket
			if (!socket || socket.readyState !== WebSocket.OPEN || !this.authenticated) return
			if (Date.now() - this.lastMessageAt >= this.heartbeatTimeoutMs) {
				this.log('warn', 'IINA 心跳逾時，連線已失效，將自動重新連線')
				this.authenticated = false
				this.updateStatus(InstanceStatus.ConnectionFailure, 'IINA 沒有回應')
				this.publishConnection('disconnected')
				socket.terminate()
				return
			}
			this.sendRaw({ type: 'ping', requestId: this.nextRequestId('heartbeat') })
		}, this.heartbeatIntervalMs)
	}

	private handleMessage(data: RawData): void {
		let message: IncomingMessage
		try {
			let text: string
			if (Array.isArray(data)) text = Buffer.concat(data).toString('utf8')
			else if (data instanceof ArrayBuffer) text = Buffer.from(data).toString('utf8')
			else text = data.toString('utf8')
			message = JSON.parse(text) as IncomingMessage
		} catch (error) {
			this.log('warn', `Invalid message from IINA: ${String(error)}`)
			return
		}
		this.lastMessageAt = Date.now()

		if (message.type === 'auth_result') {
			if (this.connectionTimer) clearTimeout(this.connectionTimer)
			this.connectionTimer = undefined
			if (message.ok) {
				this.authenticated = true
				this.startHeartbeat()
				this.updateStatus(InstanceStatus.Ok)
				this.publishConnection('connected')
				if (message.state) this.applyState(message.state)
				this.sendRaw({ type: 'get_state', requestId: this.nextRequestId('state') })
				this.refreshLibrary()
			} else {
				this.authenticated = false
				this.updateStatus(InstanceStatus.AuthenticationFailure, '配對金鑰不正確')
				this.publishConnection('authentication_failed')
			}
			return
		}

		if (message.type === 'state' || message.type === 'command_result') {
			if (message.playerId) this.activePlayerId = message.playerId
			if (message.state) this.applyState(message.state)
			if (message.type === 'command_result' && message.ok === false) {
				const detail = typeof message.error === 'string' ? message.error : message.error?.message
				this.log('warn', `IINA command failed: ${detail || 'Unknown error'}`)
			}
			return
		}

		if (message.type === 'library') {
			this.mediaFolder = typeof message.folder === 'string' ? message.folder : ''
			this.mediaFiles = Array.isArray(message.files)
				? message.files
						.filter(
							(value): value is MediaFile =>
								typeof value === 'object' &&
								value !== null &&
								typeof (value as MediaFile).label === 'string' &&
								typeof (value as MediaFile).path === 'string',
						)
						.slice(0, 2000)
				: []
			this.setVariableValues({
				media_folder: this.mediaFolder,
				media_file_count: this.mediaFiles.length,
			})
			this.updateActions()
			this.updatePresets()
			return
		}

		if (message.type === 'players') {
			this.playerWindows = Array.isArray(message.players)
				? message.players.filter(
						(value): value is PlayerWindow =>
							typeof value === 'object' && value !== null && typeof (value as PlayerWindow).id === 'string',
					)
				: []
			this.setVariableValues({ player_window_count: this.playerWindows.length })
			this.updateActions()
			return
		}

		if (message.type === 'error') {
			const detail = typeof message.error === 'string' ? message.error : message.error?.message
			this.log('warn', `IINA error: ${detail || 'Unknown error'}`)
		}
	}

	private applyState(state: IinaPlaybackState): void {
		this.state = { ...EmptyState, ...state }
		this.publishState()
		this.checkAllFeedbacks()
	}

	private publishConnection(value: string): void {
		this.setVariableValues({ connection_status: value })
		this.checkFeedbacks('connected')
	}

	private publishState(): void {
		const state = this.state
		this.setVariableValues({
			playback: state.playback,
			paused: state.paused,
			idle: state.idle,
			title: state.title,
			url: state.url,
			position: state.position ?? 0,
			duration: state.duration ?? 0,
			remaining: state.remaining ?? 0,
			remaining_seconds: state.remainingSeconds ?? 0,
			playback_finished: state.playbackFinished,
			progress: state.progress ?? 0,
			position_time: formatTime(state.position),
			duration_time: formatTime(state.duration),
			remaining_time: formatTime(state.remaining),
			volume: state.volume,
			muted: state.muted,
			speed: state.speed,
			fullscreen: state.fullscreen,
			pip: state.pip,
			ontop: state.ontop,
			playlist_position: state.playlistPosition >= 0 ? state.playlistPosition + 1 : 0,
			playlist_count: state.playlistCount,
			chapter: state.chapter >= 0 ? state.chapter + 1 : 0,
			chapter_count: state.chapterCount,
			audio_track: state.audioTrack ?? 0,
			video_track: state.videoTrack ?? 0,
			subtitle_track: state.subtitleTrack ?? 0,
			second_subtitle_track: state.secondSubtitleTrack ?? 0,
			audio_delay: state.audioDelay,
			subtitle_delay: state.subtitleDelay,
			subtitle_visible: state.subtitleVisible,
			loop_file: state.loopFile,
			loop_playlist: state.loopPlaylist,
			filename: state.filename || state.title,
			video_info: state.videoInfo || '',
			end_behavior: state.endBehavior || 'hold',
			playback_mode: state.playbackMode || 'auto_next',
			active_player_id: this.activePlayerId,
			player_window_count: this.playerWindows.length,
		})
	}

	private nextRequestId(prefix: string): string {
		this.requestCounter += 1
		return `${prefix}-${Date.now()}-${this.requestCounter}`
	}

	private sendRaw(message: Record<string, unknown>): boolean {
		const socket = this.socket
		if (!socket || socket.readyState !== WebSocket.OPEN) return false
		socket.send(JSON.stringify(message), (error) => {
			if (!error || socket !== this.socket) return
			this.log('warn', `IINA WebSocket 傳送失敗: ${error.message}`)
			try {
				socket.terminate()
			} catch (_error) {
				// The close handler will reconnect when possible.
			}
		})
		return true
	}

	sendCommand(command: string, args: Record<string, unknown> = {}): void {
		if (!this.authenticated) {
			this.log('warn', 'IINA 尚未連線，無法送出指令')
			return
		}
		if (!this.sendRaw({ type: 'command', command, args, requestId: this.nextRequestId('command') })) {
			this.log('warn', 'IINA WebSocket 尚未連線')
		}
	}

	refreshLibrary(): void {
		if (!this.authenticated) {
			this.log('warn', 'IINA 尚未連線，無法更新媒體清單')
			return
		}
		this.sendRaw({ type: 'refresh_library', requestId: this.nextRequestId('library') })
	}

	updateActions(): void {
		UpdateActions(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updatePresets(): void {
		UpdatePresets(this)
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}
}
