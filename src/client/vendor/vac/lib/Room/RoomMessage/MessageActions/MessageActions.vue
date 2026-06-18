<template>
	<div class="vac-message-actions-wrapper">
		<div
			class="vac-options-container vac-options-inline"
			:style="{
				display: hoverAudioProgress ? 'none' : 'initial'
			}"
		>
			<transition-group name="vac-slide-left" tag="span">
				<div
					v-if="isMessageActions || isMessageReactions"
					key="1"
					class="vac-blur-container"
					:class="{
						'vac-options-me': message.senderId === currentUserId
					}"
				/>

				<div
					v-if="isMessageActions"
					key="2"
					class="vac-message-actions-inline"
				>
					<div
						v-for="action in filteredMessageActions"
						:key="action.name"
						class="vac-svg-button vac-message-action-item"
						:title="action.title"
						@click="messageActionHandler(action)"
					>
						<slot :name="'action-icon_' + action.name">
							<svg-icon :name="actionIcon(action.name)" param="message" />
						</slot>
					</div>
				</div>

				<div v-if="isMessageReactions" key="3" v-click-outside="closeEmoji">
					<slot
						name="emoji-picker"
						v-bind="{ emojiOpened }"
						:add-emoji="sendMessageReaction"
					>
						<emoji-picker-container
							class="vac-message-emojis"
							:style="{ right: isMessageActions ? '30px' : '5px' }"
							:emoji-opened="emojiOpened"
							:emoji-reaction="true"
							:position-right="message.senderId === currentUserId"
							:message-id="message._id"
							:emoji-data-source="emojiDataSource"
							@add-emoji="sendMessageReaction"
							@open-emoji="openEmoji"
						>
							<template v-for="(idx, name) in $slots" #[name]="data">
								<slot :name="name" v-bind="data" />
							</template>
						</emoji-picker-container>
					</slot>
				</div>
			</transition-group>
		</div>
	</div>
</template>

<script>
import vClickOutside from '../../../../utils/on-click-outside'

import SvgIcon from '../../../../components/SvgIcon/SvgIcon'
import EmojiPickerContainer from '../../../../components/EmojiPickerContainer/EmojiPickerContainer'
import { findParentBySelector } from '../../../../utils/element-selector'

export default {
	name: 'MessageActions',
	components: { SvgIcon, EmojiPickerContainer },

	directives: {
		clickOutside: vClickOutside
	},

	props: {
		currentUserId: { type: [String, Number], required: true },
		message: { type: Object, required: true },
		messageActions: { type: Array, required: true },
		showReactionEmojis: { type: Boolean, required: true },
		messageHover: { type: Boolean, required: true },
		hoverMessageId: { type: [String, Number], default: null },
		hoverAudioProgress: { type: Boolean, required: true },
		emojiDataSource: { type: String, default: undefined }
	},

	emits: [
		'update-emoji-opened',
		'update-options-opened',
		'update-message-hover',
		'message-action-handler',
		'send-message-reaction'
	],

	data() {
		return {
			menuOptionsTop: 0,
			optionsOpened: false,
			optionsClosing: false,
			emojiOpened: false
		}
	},

	computed: {
		isMessageActions() {
			return (
				this.filteredMessageActions.length &&
				this.messageHover &&
				!this.message.deleted &&
				!this.message.disableActions &&
				!this.hoverAudioProgress
			)
		},
		isMessageReactions() {
			return (
				this.showReactionEmojis &&
				this.messageHover &&
				!this.message.deleted &&
				!this.message.disableReactions &&
				!this.hoverAudioProgress
			)
		},
		filteredMessageActions() {
			return this.message.senderId === this.currentUserId
				? this.messageActions
				: this.messageActions.filter(message => !message.onlyMe)
		}
	},

	watch: {
		emojiOpened(val) {
			this.$emit('update-emoji-opened', val)
			if (val) this.optionsOpened = false
		},
		optionsOpened(val) {
			this.$emit('update-options-opened', val)
		}
	},

	methods: {
		openOptions() {
			if (this.optionsClosing) return

			this.optionsOpened = !this.optionsOpened
			if (!this.optionsOpened) return

			setTimeout(() => {
				const roomFooterRef = findParentBySelector(this.$el, '#room-footer')

				if (
					!roomFooterRef ||
					!this.$refs.menuOptions ||
					!this.$refs.actionIcon
				) {
					return
				}

				const menuOptionsTop =
					this.$refs.menuOptions.getBoundingClientRect().height

				const actionIconTop = this.$refs.actionIcon.getBoundingClientRect().top
				const roomFooterTop = roomFooterRef.getBoundingClientRect().top

				const optionsTopPosition =
					roomFooterTop - actionIconTop > menuOptionsTop + 50

				if (optionsTopPosition) this.menuOptionsTop = 30
				else this.menuOptionsTop = -menuOptionsTop
			})
		},
		closeOptions() {
			this.optionsOpened = false
			this.optionsClosing = true
			this.updateMessageHover()
			setTimeout(() => (this.optionsClosing = false), 100)
		},
		openEmoji() {
			this.emojiOpened = !this.emojiOpened
		},
		closeEmoji() {
			this.emojiOpened = false
			this.updateMessageHover()
		},
		updateMessageHover() {
			if (this.hoverMessageId !== this.message._id) {
				this.$emit('update-message-hover', false)
			}
		},
		actionIcon(name) {
			if (/reply/i.test(name)) return 'reply'
			if (/edit/i.test(name)) return 'pencil'
			if (/delete/i.test(name)) return 'deleted'
			return 'menu'
		},
		messageActionHandler(action) {
			this.$emit('message-action-handler', action)
		},
		sendMessageReaction(emoji, reaction) {
			this.$emit('send-message-reaction', { emoji, reaction })
			this.closeEmoji()
		}
	}
}
</script>
