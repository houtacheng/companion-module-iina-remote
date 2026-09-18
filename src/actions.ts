import type ModuleInstance from './main.js'

export type ActionsSchema = {
	controller_visibility: { options: { operation: string } }
	controller_mode: { options: { operation: string } }
	playback_mode: { options: { mode: string } }
	select_player: { options: { playerId: string } }
	play_media_window: {
		options: {
			playerId: string
			label: string
			path: string
			startFromBeginning: boolean
			screen: string
			endBehavior: string
		}
	}
	play_media_file: { options: { path: string; startFromBeginning: boolean } }
	refresh_library: { options: Record<string, never> }
	transport: { options: { operation: string } }
	seek_relative: { options: { seconds: number; exact: boolean } }
	seek_absolute: { options: { seconds: number } }
	set_position_percent: { options: { percent: number } }
	set_volume: { options: { volume: number } }
	mute: { options: { operation: string } }
	set_speed: { options: { speed: number } }
	playlist: { options: { operation: string } }
	fullscreen: { options: { operation: string } }
	fullscreen_on_screen: { options: { screen: string } }
	pip: { options: { enabled: boolean } }
	ontop: { options: { enabled: boolean } }
	open: { options: { url: string } }
	playback_tools: { options: { operation: string; screenshot_mode: string } }
	auto_close_on_end: { options: { enabled: boolean } }
	playlist_manage: { options: { operation: string; index: number; url: string } }
	play_chapter: { options: { chapter: number } }
	loop: { options: { target: string; mode: string } }
	ab_loop: { options: Record<string, never> }
	set_track: { options: { trackType: string; id: number } }
	set_delay: { options: { trackType: string; seconds: number } }
	subtitle_visibility: { options: { enabled: boolean } }
	set_rotation: { options: { degrees: string } }
	set_aspect: { options: { aspect: string } }
	video_adjustment: { options: { property: string; value: number } }
	window_control: { options: { operation: string; sidebar: string } }
	show_osd: { options: { message: string } }
}

export function UpdateActions(self: ModuleInstance): void {
	self.setActionDefinitions({
		controller_visibility: {
			name: '顯示／隱藏 Remote Controller',
			options: [
				{
					id: 'operation',
					type: 'dropdown',
					label: '操作',
					default: 'toggle',
					choices: [
						{ id: 'toggle', label: '顯示／隱藏切換' },
						{ id: 'show', label: '顯示' },
						{ id: 'hide', label: '隱藏' },
					],
				},
			],
			callback: async (event) => self.sendCommand('controller_visibility', { operation: event.options.operation }),
		},
		controller_mode: {
			name: '切換 Remote Controller 完整／精簡模式',
			options: [
				{
					id: 'operation',
					type: 'dropdown',
					label: '模式',
					default: 'toggle',
					choices: [
						{ id: 'toggle', label: '完整／精簡切換' },
						{ id: 'full', label: '完整模式' },
						{ id: 'compact', label: '精簡模式' },
					],
				},
			],
			callback: async (event) => self.sendCommand('controller_mode', { operation: event.options.operation }),
		},
		playback_mode: {
			name: '設定播放順序／循環模式',
			options: [
				{
					id: 'mode',
					type: 'dropdown',
					label: '播放順序',
					default: 'auto_next',
					choices: [
						{ id: 'none', label: '不循環／不自動下一首' },
						{ id: 'single', label: '單檔循環' },
						{ id: 'auto_next', label: '依序播放，到清單末端停止' },
						{ id: 'playlist_loop', label: '清單循環' },
						{ id: 'shuffle', label: '隨機播放，到清單末端停止' },
					],
				},
			],
			callback: async (event) => self.sendCommand('set_playback_mode', { mode: event.options.mode }),
		},
		select_player: {
			name: '選擇目前控制的 IINA 視窗',
			options: [
				{
					id: 'playerId',
					type: 'dropdown',
					label: '播放視窗',
					default: self.playerWindows[0]?.id || '',
					choices: self.playerWindows.length
						? self.playerWindows.map((player) => ({ id: player.id, label: player.label || `視窗 ${player.id}` }))
						: [{ id: '', label: '尚未偵測到播放視窗' }],
				},
			],
			callback: async (event) => {
				const playerId = String(event.options.playerId || '')
				if (playerId) self.sendCommand('select_player', { playerId })
			},
		},
		play_media_window: {
			name: '在指定視窗與螢幕播放媒體',
			options: [
				{
					id: 'playerId',
					type: 'dropdown',
					label: '播放視窗',
					default: 'new',
					choices: [
						{ id: 'new', label: '建立新視窗' },
						...self.playerWindows.map((player) => ({ id: player.id, label: player.label || `視窗 ${player.id}` })),
					],
				},
				{ id: 'label', type: 'textinput', label: '新視窗名稱（建立新視窗時使用）', default: '播放視窗' },
				{
					id: 'path',
					type: 'dropdown',
					label: '媒體檔案',
					default: self.mediaFiles[0]?.path || '',
					choices: self.mediaFiles.length
						? self.mediaFiles.map((file) => ({ id: file.path, label: file.label }))
						: [{ id: '', label: '尚未取得媒體清單，請先更新' }],
				},
				{ id: 'startFromBeginning', type: 'checkbox', label: '從頭播放', default: true },
				{
					id: 'screen',
					type: 'dropdown',
					label: '輸出位置',
					default: '0',
					choices: [
						{ id: '0', label: '維持目前視窗位置' },
						{ id: '1', label: '螢幕 1 全螢幕' },
						{ id: '2', label: '螢幕 2 全螢幕' },
						{ id: '3', label: '螢幕 3 全螢幕' },
						{ id: '4', label: '螢幕 4 全螢幕' },
					],
				},
				{
					id: 'endBehavior',
					type: 'dropdown',
					label: '播放完畢',
					default: 'hold',
					choices: [
						{ id: 'hold', label: '保留視窗' },
						{ id: 'close', label: '關閉視窗' },
						{ id: 'loop', label: '循環播放' },
					],
				},
			],
			callback: async (event) => {
				const options = event.options
				if (!options.path) return self.log('warn', '尚未選擇媒體檔案')
				if (options.playerId === 'new') {
					self.sendCommand('create_player', {
						url: options.path,
						label: options.label,
						startFromBeginning: options.startFromBeginning,
						screen: options.screen,
						endBehavior: options.endBehavior,
					})
				} else {
					const playerId = String(options.playerId)
					self.sendCommand('set_end_behavior', { playerId, behavior: options.endBehavior })
					self.sendCommand('open', { playerId, url: options.path, startFromBeginning: options.startFromBeginning })
					if (options.screen !== '0') self.sendCommand('fullscreen_on_screen', { playerId, screen: options.screen })
				}
			},
		},
		play_media_file: {
			name: '從媒體資料夾選擇檔案播放',
			options: [
				{
					id: 'path',
					type: 'dropdown',
					label: '媒體檔案',
					default: self.mediaFiles[0]?.path || '',
					choices:
						self.mediaFiles.length > 0
							? self.mediaFiles.map((file) => ({ id: file.path, label: file.label }))
							: [{ id: '', label: '尚未取得媒體清單，請先更新' }],
				},
				{
					id: 'startFromBeginning',
					type: 'checkbox',
					label: '從頭播放',
					default: true,
				},
			],
			callback: async (event) => {
				const path = String(event.options.path || '')
				if (!path) self.log('warn', '尚未選擇媒體檔案')
				else self.sendCommand('open', { url: path, startFromBeginning: event.options.startFromBeginning === true })
			},
		},
		refresh_library: {
			name: '更新媒體檔案清單',
			options: [],
			callback: async () => self.refreshLibrary(),
		},
		transport: {
			name: '播放控制',
			options: [
				{
					id: 'operation',
					type: 'dropdown',
					label: '操作',
					default: 'toggle_play_pause',
					choices: [
						{ id: 'play', label: '播放' },
						{ id: 'pause', label: '暫停' },
						{ id: 'toggle_play_pause', label: '播放／暫停切換' },
						{ id: 'stop', label: '停止' },
					],
				},
			],
			callback: async (event) => self.sendCommand(String(event.options.operation)),
		},
		seek_relative: {
			name: '相對跳轉',
			options: [
				{ id: 'seconds', type: 'number', label: '秒數（負數為後退）', default: 10, min: -86400, max: 86400 },
				{ id: 'exact', type: 'checkbox', label: '精確跳轉', default: false },
			],
			callback: async (event) =>
				self.sendCommand('seek_relative', { seconds: event.options.seconds, exact: event.options.exact }),
		},
		seek_absolute: {
			name: '跳至指定時間',
			options: [{ id: 'seconds', type: 'number', label: '從開頭起算秒數', default: 0, min: 0, max: 864000 }],
			callback: async (event) => self.sendCommand('seek_absolute', { seconds: event.options.seconds }),
		},
		set_position_percent: {
			name: '跳至播放百分比',
			options: [{ id: 'percent', type: 'number', label: '百分比', default: 50, min: 0, max: 100 }],
			callback: async (event) => self.sendCommand('set_position_percent', { percent: event.options.percent }),
		},
		set_volume: {
			name: '設定音量',
			options: [{ id: 'volume', type: 'number', label: '音量', default: 50, min: 0, max: 200 }],
			callback: async (event) => self.sendCommand('set_volume', { volume: event.options.volume }),
		},
		mute: {
			name: '靜音控制',
			options: [
				{
					id: 'operation',
					type: 'dropdown',
					label: '操作',
					default: 'toggle',
					choices: [
						{ id: 'on', label: '開啟靜音' },
						{ id: 'off', label: '關閉靜音' },
						{ id: 'toggle', label: '切換靜音' },
					],
				},
			],
			callback: async (event) => {
				const operation = String(event.options.operation)
				if (operation === 'toggle') self.sendCommand('toggle_mute')
				else self.sendCommand('set_mute', { muted: operation === 'on' })
			},
		},
		set_speed: {
			name: '設定播放速度',
			options: [{ id: 'speed', type: 'number', label: '倍速', default: 1, min: 0.01, max: 100, step: 0.05 }],
			callback: async (event) => self.sendCommand('set_speed', { speed: event.options.speed }),
		},
		playlist: {
			name: '播放清單控制',
			options: [
				{
					id: 'operation',
					type: 'dropdown',
					label: '操作',
					default: 'playlist_next',
					choices: [
						{ id: 'playlist_next', label: '下一個' },
						{ id: 'playlist_previous', label: '上一個' },
					],
				},
			],
			callback: async (event) => self.sendCommand(String(event.options.operation)),
		},
		fullscreen: {
			name: '全螢幕控制',
			options: [
				{
					id: 'operation',
					type: 'dropdown',
					label: '操作',
					default: 'toggle',
					choices: [
						{ id: 'on', label: '開啟' },
						{ id: 'off', label: '關閉' },
						{ id: 'toggle', label: '切換' },
					],
				},
			],
			callback: async (event) => {
				const operation = String(event.options.operation)
				if (operation === 'toggle') self.sendCommand('toggle_fullscreen')
				else self.sendCommand('set_fullscreen', { enabled: operation === 'on' })
			},
		},
		fullscreen_on_screen: {
			name: '在指定螢幕全螢幕播放',
			options: [
				{
					id: 'screen',
					type: 'dropdown',
					label: '目標螢幕',
					default: '2',
					choices: [
						{ id: '1', label: '螢幕 1' },
						{ id: '2', label: '螢幕 2' },
						{ id: '3', label: '螢幕 3' },
						{ id: '4', label: '螢幕 4' },
					],
				},
			],
			callback: async (event) => self.sendCommand('fullscreen_on_screen', { screen: Number(event.options.screen) }),
		},
		pip: {
			name: '子母畫面',
			options: [{ id: 'enabled', type: 'checkbox', label: '開啟子母畫面', default: true }],
			callback: async (event) => self.sendCommand('set_pip', { enabled: event.options.enabled }),
		},
		ontop: {
			name: '視窗置頂',
			options: [{ id: 'enabled', type: 'checkbox', label: '保持在最上層', default: true }],
			callback: async (event) => self.sendCommand('set_ontop', { enabled: event.options.enabled }),
		},
		open: {
			name: '開啟媒體',
			options: [
				{
					id: 'url',
					type: 'textinput',
					label: '檔案路徑或網址',
					default: '',
					useVariables: true,
				},
			],
			callback: async (event) => self.sendCommand('open', { url: event.options.url }),
		},
		playback_tools: {
			name: '其他播放操作',
			options: [
				{
					id: 'operation',
					type: 'dropdown',
					label: '操作',
					default: 'frame_step',
					choices: [
						{ id: 'frame_step', label: '前進一格' },
						{ id: 'frame_back_step', label: '後退一格' },
						{ id: 'screenshot', label: '截圖' },
						{ id: 'close_window', label: '關閉播放視窗' },
					],
				},
				{
					id: 'screenshot_mode',
					type: 'dropdown',
					label: '截圖內容',
					default: 'subtitles',
					choices: [
						{ id: 'subtitles', label: '包含字幕' },
						{ id: 'video', label: '只有影片' },
						{ id: 'window', label: '整個播放器視窗' },
					],
				},
			],
			callback: async (event) =>
				self.sendCommand(String(event.options.operation), { mode: event.options.screenshot_mode }),
		},
		auto_close_on_end: {
			name: '播放完畢自動關閉視窗',
			options: [{ id: 'enabled', type: 'checkbox', label: '啟用', default: true }],
			callback: async (event) => self.sendCommand('set_auto_close_on_end', { enabled: event.options.enabled }),
		},
		playlist_manage: {
			name: '播放清單管理',
			options: [
				{
					id: 'operation',
					type: 'dropdown',
					label: '操作',
					default: 'playlist_play',
					choices: [
						{ id: 'playlist_play', label: '播放指定項目' },
						{ id: 'playlist_add', label: '加入項目' },
						{ id: 'playlist_remove', label: '移除指定項目' },
						{ id: 'playlist_clear', label: '清除播放清單' },
						{ id: 'playlist_shuffle', label: '隨機排列' },
					],
				},
				{ id: 'index', type: 'number', label: '項目編號（從 1 開始）', default: 1, min: 1, max: 10000 },
				{ id: 'url', type: 'textinput', label: '加入的路徑或網址', default: '', useVariables: true },
			],
			callback: async (event) =>
				self.sendCommand(String(event.options.operation), { index: event.options.index, url: event.options.url }),
		},
		play_chapter: {
			name: '播放指定章節',
			options: [{ id: 'chapter', type: 'number', label: '章節編號（從 1 開始）', default: 1, min: 1, max: 10000 }],
			callback: async (event) => self.sendCommand('play_chapter', { chapter: event.options.chapter }),
		},
		loop: {
			name: '循環播放設定',
			options: [
				{
					id: 'target',
					type: 'dropdown',
					label: '目標',
					default: 'file',
					choices: [
						{ id: 'file', label: '目前檔案' },
						{ id: 'playlist', label: '播放清單' },
					],
				},
				{
					id: 'mode',
					type: 'dropdown',
					label: '模式',
					default: 'inf',
					choices: [
						{ id: 'no', label: '關閉' },
						{ id: 'inf', label: '無限循環' },
					],
				},
			],
			callback: async (event) =>
				self.sendCommand(event.options.target === 'file' ? 'set_loop_file' : 'set_loop_playlist', {
					mode: event.options.mode,
				}),
		},
		ab_loop: {
			name: '設定／切換 AB 循環點',
			options: [],
			callback: async () => self.sendCommand('ab_loop'),
		},
		set_track: {
			name: '選擇視訊／音訊／字幕軌',
			options: [
				{
					id: 'trackType',
					type: 'dropdown',
					label: '軌道類型',
					default: 'audio',
					choices: [
						{ id: 'video', label: '視訊' },
						{ id: 'audio', label: '音訊' },
						{ id: 'subtitle', label: '字幕' },
						{ id: 'second_subtitle', label: '第二字幕' },
					],
				},
				{ id: 'id', type: 'number', label: '軌道 ID', default: 1, min: -1, max: 10000 },
			],
			callback: async (event) =>
				self.sendCommand('set_track', { trackType: event.options.trackType, id: event.options.id }),
		},
		set_delay: {
			name: '設定音訊／字幕延遲',
			options: [
				{
					id: 'trackType',
					type: 'dropdown',
					label: '類型',
					default: 'subtitle',
					choices: [
						{ id: 'audio', label: '音訊' },
						{ id: 'subtitle', label: '字幕' },
					],
				},
				{ id: 'seconds', type: 'number', label: '延遲秒數', default: 0, min: -3600, max: 3600, step: 0.05 },
			],
			callback: async (event) =>
				self.sendCommand('set_delay', { trackType: event.options.trackType, seconds: event.options.seconds }),
		},
		subtitle_visibility: {
			name: '顯示／隱藏字幕',
			options: [{ id: 'enabled', type: 'checkbox', label: '顯示字幕', default: true }],
			callback: async (event) => self.sendCommand('set_subtitle_visibility', { enabled: event.options.enabled }),
		},
		set_rotation: {
			name: '旋轉影片',
			options: [
				{
					id: 'degrees',
					type: 'dropdown',
					label: '角度',
					default: '0',
					choices: [
						{ id: '0', label: '0°' },
						{ id: '90', label: '90°' },
						{ id: '180', label: '180°' },
						{ id: '270', label: '270°' },
					],
				},
			],
			callback: async (event) => self.sendCommand('set_rotation', { degrees: Number(event.options.degrees) }),
		},
		set_aspect: {
			name: '設定畫面比例',
			options: [
				{ id: 'aspect', type: 'textinput', label: '比例', default: '-1', tooltip: '例如 16:9、4:3；-1 恢復原始比例' },
			],
			callback: async (event) => self.sendCommand('set_aspect', { aspect: event.options.aspect }),
		},
		video_adjustment: {
			name: '調整影片影像',
			options: [
				{
					id: 'property',
					type: 'dropdown',
					label: '項目',
					default: 'brightness',
					choices: [
						{ id: 'brightness', label: '亮度' },
						{ id: 'contrast', label: '對比' },
						{ id: 'gamma', label: 'Gamma' },
						{ id: 'saturation', label: '飽和度' },
						{ id: 'hue', label: '色相' },
					],
				},
				{ id: 'value', type: 'number', label: '數值', default: 0, min: -100, max: 100 },
			],
			callback: async (event) =>
				self.sendCommand('set_video_adjustment', { property: event.options.property, value: event.options.value }),
		},
		window_control: {
			name: '播放器視窗控制',
			options: [
				{
					id: 'operation',
					type: 'dropdown',
					label: '操作',
					default: 'minimize',
					choices: [
						{ id: 'minimize', label: '縮到最小' },
						{ id: 'restore', label: '還原視窗' },
						{ id: 'sidebar', label: '顯示側邊欄' },
					],
				},
				{
					id: 'sidebar',
					type: 'dropdown',
					label: '側邊欄',
					default: 'playlist',
					choices: [
						{ id: 'none', label: '關閉側邊欄' },
						{ id: 'playlist', label: '播放清單' },
						{ id: 'chapters', label: '章節' },
						{ id: 'video', label: '視訊' },
						{ id: 'audio', label: '音訊' },
						{ id: 'sub', label: '字幕' },
					],
				},
			],
			callback: async (event) => {
				const operation = String(event.options.operation)
				if (operation === 'sidebar') self.sendCommand('show_sidebar', { sidebar: event.options.sidebar })
				else self.sendCommand('set_minimized', { enabled: operation === 'minimize' })
			},
		},
		show_osd: {
			name: '在 IINA 顯示訊息',
			options: [{ id: 'message', type: 'textinput', label: '訊息', default: '', useVariables: true }],
			callback: async (event) => self.sendCommand('show_osd', { message: event.options.message }),
		},
	})
}
