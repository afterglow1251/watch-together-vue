<template>
	<div class="vac-emoji-wrapper">
		<div
			class="vac-svg-button"
			:class="{ 'vac-emoji-reaction': emojiReaction }"
			@click="openEmoji"
		>
			<slot
				:name="
					messageId
						? 'emoji-picker-reaction-icon_' + messageId
						: 'emoji-picker-icon'
				"
			>
				<svg-icon name="emoji" :param="emojiReaction ? 'reaction' : ''" />
			</slot>
		</div>

		<template v-if="emojiOpened">
			<transition name="vac-slide-up" appear>
				<div
					class="vac-emoji-picker"
					:class="{ 'vac-picker-reaction': emojiReaction }"
					:style="{
						height: `${emojiPickerHeight}px`,
						top: positionTop ? emojiPickerHeight : `${emojiPickerTop}px`,
						left: emojiPickerLeft,
						right: emojiPickerRight,
						bottom: emojiReaction ? 'auto' : undefined,
						display: emojiPickerTop || !emojiReaction ? 'initial' : 'none'
					}"
				>
					<emoji-picker
						v-if="emojiOpened"
						ref="emojiPicker"
						:data-source="emojiDataSource"
					/>
				</div>
			</transition>
		</template>
	</div>
</template>

<script>
import SvgIcon from '../SvgIcon/SvgIcon'
import { findParentBySelector } from '../../utils/element-selector'

export default {
	name: 'EmojiPickerContainer',
	components: {
		SvgIcon
	},

	props: {
		emojiOpened: { type: Boolean, default: false },
		emojiReaction: { type: Boolean, default: false },
		positionTop: { type: Boolean, default: false },
		positionRight: { type: Boolean, default: false },
		messageId: { type: String, default: '' },
		emojiDataSource: { type: String, default: undefined }
	},

	emits: ['add-emoji', 'open-emoji'],

	data() {
		return {
			emojiPickerHeight: 320,
			emojiPickerTop: 0,
			emojiPickerRight: '',
			emojiPickerLeft: ''
		}
	},

	watch: {
		emojiOpened(val) {
			if (val) {
				setTimeout(() => {
					this.addCustomStyling()

					this.$refs.emojiPicker.shadowRoot.addEventListener(
						'emoji-click',
						({ detail }) => {
							this.$emit('add-emoji', {
								unicode: detail.unicode
							})
						}
					)
				}, 0)
			}
		}
	},

	methods: {
		addCustomStyling() {
			const picker = `.picker {
				border: none;
			}`

			const nav = `.nav {
				overflow-x: auto;
			}`

			const searchBox = `.search-wrapper {
				padding-right: 2px;
				padding-left: 2px;
			}`

			const search = `input.search {
				height: 32px;
				font-size: 14px;
				border-radius: 10rem;
				border: var(--chat-border-style);
				padding: 5px 10px;
				outline: none;
				background: var(--chat-bg-color-input);
				color: var(--chat-color);
			}`

			// Fade out the bottom edge of the scrollable grid so a partially
			// clipped emoji row doesn't peek above the favorites bar; and give it
			// the same minimalist pink scrollbar as the chat.
			const tabpanel = `.tabpanel {
				-webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 30px), transparent);
				mask-image: linear-gradient(to bottom, #000 calc(100% - 30px), transparent);
				scrollbar-width: thin;
				scrollbar-color: rgba(232, 67, 147, 0.4) transparent;
			}
			.tabpanel::-webkit-scrollbar {
				width: 6px;
			}
			.tabpanel::-webkit-scrollbar-track {
				background: transparent;
			}
			.tabpanel::-webkit-scrollbar-thumb {
				background: rgba(232, 67, 147, 0.35);
				border-radius: 3px;
			}
			.tabpanel::-webkit-scrollbar-thumb:hover {
				background: rgba(232, 67, 147, 0.6);
			}`

			const style = document.createElement('style')
			style.textContent = picker + nav + searchBox + search + tabpanel
			this.$refs.emojiPicker.shadowRoot.appendChild(style)
		},
		openEmoji(ev) {
			this.$emit('open-emoji', !this.emojiOpened)
			this.setEmojiPickerPosition(
				ev.clientY,
				ev.clientX,
				ev.view.innerWidth,
				ev.view.innerHeight
			)
		},
		setEmojiPickerPosition(clientY, clientX, innerWidth, innerHeight) {
			if (this.emojiReaction) {
				// Reaction picker is position:fixed (containing block = viewport, no
				// transformed ancestor). Anchor to the emoji BUTTON's rect — not the
				// click coords — so the position is deterministic regardless of where
				// inside the icon you click. Always open ABOVE the button and clamp
				// into view.
				const margin = 8
				const gap = 4
				const height = Math.min(320, innerHeight - margin * 2)
				this.emojiPickerHeight = height

				const buttonTop = this.$el.getBoundingClientRect().top

				let top = buttonTop - gap - height
				if (top < margin) top = margin
				if (top + height > innerHeight - margin) {
					top = Math.max(margin, innerHeight - margin - height)
				}

				this.emojiPickerTop = top
				this.emojiPickerLeft = '4px'
				this.emojiPickerRight = 'auto'
				return
			}

			const mobileSize = innerWidth < 500 || innerHeight < 700
			const roomFooterRef = findParentBySelector(this.$el, '#room-footer')

			if (!roomFooterRef) {
				if (mobileSize) this.emojiPickerRight = '-50px'
				return
			}

			if (mobileSize) {
				this.emojiPickerRight =
					innerWidth / 2 - (this.positionTop ? 200 : 150) + 'px'
				this.emojiPickerTop = 100
				this.emojiPickerHeight = innerHeight - 200
			} else {
				const roomFooterTop = roomFooterRef.getBoundingClientRect().top
				const pickerTopPosition =
					roomFooterTop - clientY > this.emojiPickerHeight - 50

				if (pickerTopPosition) this.emojiPickerTop = clientY + 10
				else this.emojiPickerTop = clientY - this.emojiPickerHeight - 10

				if (this.positionTop) {
					// Align the picker to the LEFT edge of the emoji button (opens
					// toward the right) with a small 4px offset.
					this.emojiPickerLeft = '4px'
					this.emojiPickerRight = 'auto'
				} else {
					this.emojiPickerRight = this.positionRight ? '60px' : ''
				}
			}
		}
	}
}
</script>
