<template>
	<view class="page">
		<view class="example-info">
			<text class="example-info-text">图标组件方便用户在设计页面的时候，减少小图片的使用。可方便自定义图标单色、尺寸</text>
		</view>
		<uni-section title="基础图标" type="line">
			<view class="uni-right">
				<text class="uni-right-text">显示{{ checked?' unicode':'图标名' }}</text>
				<switch :checked="checked" class="switch" @change="change" />
			</view>
		</uni-section>
		<view class="example-body">
			<view v-for="(item,index) in iconClassList" :key="index" class="icon-item" @click="switchActive(index)">
				<uni-icons :type="item.name" :color="activeIndex === index?'#007aff':'#8f8f94'" size="25" />
				<text :style="{color:activeIndex === index?'#007aff':'#8f8f94'}" class="icon-item-text">{{ checked? item.unicode: item.name }}</text>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		components: {},
		data() {
			return {
				iconClassList: [{
					"name": "arrowdown",
					"unicode": "e581"
				}, {
					"name": "arrowleft",
					"unicode": "e582"
				}, {
					"name": "arrowright",
					"unicode": "e583"
				}, {
					"name": "arrowup",
					"unicode": "e580"
				}, {
					"name": "arrowthindown",
					"unicode": "e585"
				}, {
					"name": "arrowthinleft",
					"unicode": "e586"
				}, {
					"name": "arrowthinright",
					"unicode": "e587"
				}, {
					"name": "arrowthinup",
					"unicode": "e584"
				}, {
					"name": "back",
					"unicode": "e471"
				}, {
					"name": "forward",
					"unicode": "e470"
				}, {
					"name": "camera",
					"unicode": "e301"
				}, {
					"name": "camera-filled",
					"unicode": "e7ef"
				}, {
					"name": "cart",
					"unicode": "e7f5"
				}, {
					"name": "cart-filled",
					"unicode": "e7f4"
				}, {
					"name": "chat",
					"unicode": "e263"
				}, {
					"name": "chat-filled",
					"unicode": "e847"
				}, {
					"name": "chatboxes",
					"unicode": "e203"
				}, {
					"name": "chatboxes-filled",
					"unicode": "e233"
				}, {
					"name": "chatbubble",
					"unicode": "e202"
				}, {
					"name": "chatbubble-filled",
					"unicode": "e232"
				}, {
					"name": "checkbox",
					"unicode": "e7fa"
				}, {
					"name": "checkbox-filled",
					"unicode": "e442"
				}, {
					"name": "close",
					"unicode": "e404"
				}, {
					"name": "clear",
					"unicode": "e434"
				}, {
					"name": "circle",
					"unicode": "e411"
				}, {
					"name": "circle-filled",
					"unicode": "e441"
				}, {
					"name": "checkmarkempty",
					"unicode": "e472"
				}, {
					"name": "closeempty",
					"unicode": "e460"
				}, {
					"name": "cloud-download",
					"unicode": "e8e4"
				}, {
					"name": "cloud-download-filled",
					"unicode": "e8e9"
				}, {
					"name": "cloud-upload",
					"unicode": "e8e6"
				}, {
					"name": "cloud-upload-filled",
					"unicode": "e8e5"
				}, {
					"name": "contact",
					"unicode": "e100"
				}, {
					"name": "contact-filled",
					"unicode": "e130"
				}, {
					"name": "download",
					"unicode": "e403"
				}, {
					"name": "download-filled",
					"unicode": "e8a4"
				}, {
					"name": "email",
					"unicode": "e201"
				}, {
					"name": "email-filled",
					"unicode": "e231"
				}, {
					"name": "mail-open",
					"unicode": "e84e"
				}, {
					"name": "mail-open-filled",
					"unicode": "e84d"
				}, {
					"name": "eye",
					"unicode": "e824"
				}, {
					"name": "eye-filled",
					"unicode": "e568"
				}, {
					"name": "eye-slash",
					"unicode": "e823"
				}, {
					"name": "eye-slash-filled",
					"unicode": "e822"
				}, {
					"name": "hand-thumbsdown",
					"unicode": "e83c"
				}, {
					"name": "hand-thumbsdown-filled",
					"unicode": "e83b"
				}, {
					"name": "hand-thumbsup",
					"unicode": "e83f"
				}, {
					"name": "hand-thumbsup-filled",
					"unicode": "e83d"
				}, {
					"name": "gear",
					"unicode": "e502"
				}, {
					"name": "gear-filled",
					"unicode": "e532"
				}, {
					"name": "flag",
					"unicode": "e508"
				}, {
					"name": "flag-filled",
					"unicode": "e825"
				}, {
					"name": "heart",
					"unicode": "e840"
				}, {
					"name": "heart-filled",
					"unicode": "e83e"
				}, {
					"name": "help",
					"unicode": "e505"
				}, {
					"name": "help-filled",
					"unicode": "e535"
				}, {
					"name": "image",
					"unicode": "e363"
				}, {
					"name": "image-filled",
					"unicode": "e877"
				}, {
					"name": "images",
					"unicode": "e87b"
				}, {
					"name": "images-filled",
					"unicode": "e87a"
				}, {
					"name": "home",
					"unicode": "e500"
				}, {
					"name": "home-filled",
					"unicode": "e530"
				}, {
					"name": "info",
					"unicode": "e504"
				}, {
					"name": "info-filled",
					"unicode": "e534"
				}, {
					"name": "location",
					"unicode": "e303"
				}, {
					"name": "location-filled",
					"unicode": "e333"
				}, {
					"name": "locked",
					"unicode": "e506"
				}, {
					"name": "locked-filled",
					"unicode": "e856"
				}, {
					"name": "map",
					"unicode": "e364"
				}, {
					"name": "map-filled",
					"unicode": "e85c"
				}, {
					"name": "map-pin",
					"unicode": "e85e"
				}, {
					"name": "map-pin-ellipse",
					"unicode": "e864"
				}, {
					"name": "mic",
					"unicode": "e302"
				}, {
					"name": "mic-filled",
					"unicode": "e332"
				}, {
					"name": "micoff",
					"unicode": "e360"
				}, {
					"name": "mic-slash-filled",
					"unicode": "e892"
				}, {
					"name": "minus",
					"unicode": "e410"
				}, {
					"name": "minus-filled",
					"unicode": "e440"
				}, {
					"name": "more",
					"unicode": "e507"
				}, {
					"name": "more-filled",
					"unicode": "e537"
				}, {
					"name": "navigate",
					"unicode": "e501"
				}, {
					"name": "navigate-filled",
					"unicode": "e884"
				}, {
					"name": "paperplane",
					"unicode": "e503"
				}, {
					"name": "paperplane-filled",
					"unicode": "e86e"
				}, {
					"name": "person",
					"unicode": "e101"
				}, {
					"name": "person-filled",
					"unicode": "e131"
				}, {
					"name": "personadd",
					"unicode": "e102"
				}, {
					"name": "personadd-filled",
					"unicode": "e132"
				}, {
					"name": "phone",
					"unicode": "e200"
				}, {
					"name": "phone-filled",
					"unicode": "e230"
				}, {
					"name": "plus",
					"unicode": "e409"
				}, {
					"name": "plus-filled",
					"unicode": "e439"
				}, {
					"name": "redo",
					"unicode": "e405"
				}, {
					"name": "redo-filled",
					"unicode": "e7d9"
				}, {
					"name": "undo",
					"unicode": "e406"
				}, {
					"name": "undo-filled",
					"unicode": "e7d6"
				}, {
					"name": "qq",
					"unicode": "e264"
				}, {
					"name": "weibo",
					"unicode": "e260"
				}, {
					"name": "weixin",
					"unicode": "e261"
				}, {
					"name": "pengyouquan",
					"unicode": "e262"
				}, {
					"name": "refresh",
					"unicode": "e407"
				}, {
					"name": "refresh-filled",
					"unicode": "e437"
				}, {
					"name": "refreshempty",
					"unicode": "e461"
				}, {
					"name": "reload",
					"unicode": "e462"
				}, {
					"name": "upload",
					"unicode": "e402"
				}, {
					"name": "upload-filled",
					"unicode": "e8b1"
				}, {
					"name": "smallcircle",
					"unicode": "e868"
				}, {
					"name": "smallcircle-filled",
					"unicode": "e801"
				}, {
					"name": "sound",
					"unicode": "e590"
				}, {
					"name": "sound-filled",
					"unicode": "e8a1"
				}, {
					"name": "trash",
					"unicode": "e401"
				}, {
					"name": "trash-filled",
					"unicode": "e8dc"
				}, {
					"name": "videocam",
					"unicode": "e300"
				}, {
					"name": "videocam-filled",
					"unicode": "e8af"
				}, {
					"name": "star",
					"unicode": "e408"
				}, {
					"name": "star-filled",
					"unicode": "e438"
				}, {
					"name": "starhalf",
					"unicode": "e463"
				}, {
					"name": "spinner-cycle",
					"unicode": "e465"
				}, {
					"name": "scan",
					"unicode": "e612"
				}, {
					"name": "search",
					"unicode": "e466"
				}, {
					"name": "settings",
					"unicode": "e560"
				}, {
					"name": "compose",
					"unicode": "e400"
				}, {
					"name": "bars",
					"unicode": "e563"
				}, {
					"name": "list",
					"unicode": "e562"
				}, {
					"name": "loop",
					"unicode": "e565"
				}, {
					"name": "paperclip",
					"unicode": "e567"
				}, {
					"name": "plusempty",
					"unicode": "e468"
				}, {
					"name": "pulldown",
					"unicode": "e588"
				}, {
					"name": "headphones",
					"unicode": "e8bf"
				}, {
					"name": "shop",
					"shop": "e609"
				}],
				activeIndex: -1,
				checked: false
			}
		},
		methods: {
			change(e) {
				// e.detail.value在安卓手机上可能是String类型，后续修复后要修改
				this.checked = e.detail.value === 'false' || !e.detail.value ? false : true
			},
			switchActive(index) {
				this.activeIndex = index
			}
		}
	}
</script>

<style>
	/* 头条小程序组件内不能引入字体 */
	/* #ifdef MP-TOUTIAO */
	@font-face {
		font-family: uniicons;
		font-weight: normal;
		font-style: normal;
		src: url("~@/static/uni.ttf") format("truetype");
	}

	/* #endif */
	/* #ifndef APP-NVUE */
	page {
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
		background-color: #efeff4;
		min-height: 100%;
		height: auto;
	}

	view {
		font-size: 14px;
		line-height: inherit;
	}

	.example {
		padding: 0 15px 15px;
	}

	.example-info {
		padding: 15px;
		color: #3b4144;
		background: #ffffff;
	}

	.example-body {
		/* #ifndef APP-NVUE */
		display: flex;
		/* #endif */
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
		padding: 0;
		font-size: 14px;
		background-color: #ffffff;
	}

	/* #endif */
	.example {
		padding: 0 15px;
	}

	.example-info {
		/* #ifndef APP-NVUE */
		display: block;
		/* #endif */
		padding: 15px;
		color: #3b4144;
		background-color: #ffffff;
		font-size: 14px;
		line-height: 20px;
	}

	.example-info-text {
		font-size: 14px;
		line-height: 20px;
		color: #3b4144;
	}

	.example-body {
		flex-direction: column;
		padding: 15px;
		background-color: #ffffff;
	}

	.word-btn-white {
		font-size: 18px;
		color: #FFFFFF;
	}

	.word-btn {
		/* #ifndef APP-NVUE */
		display: flex;
		/* #endif */
		flex-direction: row;
		align-items: center;
		justify-content: center;
		border-radius: 6px;
		height: 48px;
		margin: 15px;
		background-color: #007AFF;
	}

	.word-btn--hover {
		background-color: #4ca2ff;
	}

	.example-body {
		padding: 0;
		flex-direction: row;
		flex-wrap: wrap;
	}

	.uni-right {
		flex-direction: row;
		flex-wrap: nowrap;
		align-items: center;
		color: #666;
	}

	.uni-right-text {
		font-size: 28rpx;
	}

	.switch {
		transform: scale(0.8);
		margin-left: 5px;
	}

	.icon-item {
		/* #ifndef APP-NVUE */
		display: flex;
		box-sizing: border-box;
		/* #endif */
		width: 180rpx;
		padding: 30rpx 10rpx;
		text-align: center;
		flex-direction: column;
	}

	.icon-item-text {
		font-size: 24rpx;
		text-align: center;
	}
</style>