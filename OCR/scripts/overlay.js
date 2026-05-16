window.browser = (function () {
	return window.msBrowser ||
		window.browser ||
		window.chrome;
})();

(function () {
	'use strict';
	
	const fadeEffect = (el, type, duration = 300) => {
		if (!el) return;
		el.style.transition = `opacity ${duration}ms ease`;
		if (type === 'in') {
			el.style.display = 'block';
			setTimeout(() => el.style.opacity = 1, 10);
		} else {
			el.style.opacity = 0;
			setTimeout(() => el.style.display = 'none', duration);
		}
	};

	const htmlDialog = function () {
		const allMethod = {
			init: function () {
				let self = this;
				const body = document.body;
				
				body.addEventListener('click', (e) => {
					const closeBtn = e.target.closest('[popup-close]');
					if (closeBtn) {
						const popupName = closeBtn.getAttribute('popup-close');
						const popup = document.querySelector(`[popup-name="${popupName}"]`);
						fadeEffect(popup, 'out');
					}
					
					const dialogClose = e.target.closest('.cp-dialog-close-button');
					if (dialogClose) {
						const popupName = dialogClose.querySelector('[popup-close]')?.getAttribute('popup-close');
						const popup = document.querySelector(`[popup-name="${popupName}"]`);
						fadeEffect(popup, 'out');
					}
				});

				document.addEventListener('keyup', (e) => {
					if (e.keyCode === 27) self.closeDialog();
				});
				
				body.setAttribute('data-ocrext-dialog', '1');
			},
			closeDialog: function(){
				const dialog = document.getElementById('cfish-popup-message-dialog');
				fadeEffect(dialog, 'out');
				
				const ocrLocal = document.getElementById('OcrLocal');
				const isFoundLocal = ocrLocal?.getAttribute('LocalOcrFound');
				if (ocrLocal?.checked && isFoundLocal === 'NO') {
					document.getElementById('OcrSpace')?.click();
				}
			},
			hardClose: function(){
				const dialog = document.getElementById('cfish-popup-message-dialog');
				if (dialog) dialog.style.display = 'none';
			},
			showDialog: function (header, message, buttons) {
				document.getElementById('cp-dialog-title').textContent = header;
				document.getElementById('cp-dialog-description').textContent = message;
				document.getElementById('cp-dialog-image').src = browser.runtime.getURL("images/copyfish-32.png");

				const desc = document.getElementById('cp-dialog-description');
				if (buttons && buttons.length) {
					const buttonRow = document.createElement('div');
					buttonRow.className = 'button-row ' + (buttons.length === 1 ? 'btn-center' : '');
					
					buttons.forEach((single) => {
						const { label = '', cb = () => { } } = single;
						const span = document.createElement('span');
						const button = document.createElement('button');
						button.className = 'cp-show-dialog-button ocrext-btn';
						button.textContent = label;
						button.addEventListener('click', cb);
						span.appendChild(button);
						buttonRow.appendChild(span);
					});
					desc.appendChild(buttonRow);
				}
				
				const popup = document.querySelector('[popup-name="popup-1"]');
				fadeEffect(popup, 'in');
			},
		}
		return allMethod;
	};

	var TextOverlay = function () {
		var _overlay;
		var $container = document.querySelector('.ocrext-textoverlay-container');
		var _overlayInstance;

		var _isOverlayAvailable = function () {
			return !!_overlay && _overlay.HasOverlay;
		};

		var _init = function () {
			if ($container) {
				const oldOverlay = $container.querySelector('.ocrext-text-overlay');
				if (oldOverlay) oldOverlay.remove();
				
				// Creación segura de elementos DOM (sin usar innerHTML o insertAdjacentHTML)
				const overlay = document.createElement('div');
				overlay.className = 'ocrext-element ocrext-text-overlay';
				
				const wrapper = document.createElement('div');
				wrapper.className = 'ocrext-element ocrext-text-overlay-word-wrapper';
				
				const img = document.createElement('img');
				img.className = 'ocrext-element ocrext-text-overlay-img text-overlay-img';
				
				wrapper.appendChild(img);
				overlay.appendChild(wrapper);
				$container.appendChild(overlay);
				
				$container.addEventListener('click', (e) => {
					if (e.target.closest('.ocrext-close-link')) _overlayInstance.hide();
				});
			}
		};

		_overlayInstance = {
			setOverlayInformation: function (overlayInfo, canvasWidth, canHeight, imgDataURI, zoom) {
				if (!_overlay) {
					_overlay = overlayInfo;
					this.render(canvasWidth, canHeight, imgDataURI, zoom);
				}
				return this;
			},
			getOverlayInformation: function () {
				return _overlay;
			},
			render: function (canvasWidth, canvasHeight, imgDataURI, zoom) {
				zoom = zoom || 1;
				if (_isOverlayAvailable() && $container) {
					const lines = _overlay.Lines;
					const wordWrapper = $container.querySelector('.ocrext-text-overlay-word-wrapper');
					
					if (imgDataURI) {
						$container.querySelector('.text-overlay-img').src = imgDataURI;
					}

					this.setDimensions(canvasWidth, canvasHeight);
					
					lines.forEach(line => {
						const maxLineHeight = line.MaxHeight * zoom;
						const minLineTopDist = line.MinTop * zoom;
						
						line.Words.forEach(word => {
							const span = document.createElement('span');
							span.className = 'ocrext-element ocrext-text-overlay-word';
							span.textContent = word.WordText;
							Object.assign(span.style, {
								left: (word.Left * zoom) + 'px',
								top: minLineTopDist + 'px',
								height: maxLineHeight + 'px',
								width: (word.Width * zoom) + 'px',
								fontSize: (maxLineHeight * 0.7) + 'px',
								position: 'absolute'
							});
							wordWrapper.appendChild(span);
						});
					});
				}
				return this;
			},
			setDimensions: function (width, height) {
				if ($container) {
					const targets = [$container.querySelector('.ocrext-text-overlay'), $container.querySelector('.ocrext-text-overlay-word-wrapper')];
					targets.forEach(el => {
						if (el) {
							el.style.width = width + 'px';
							el.style.height = height + 'px';
						}
					});
				}
				return this;
			},
			reset: function () {
				_overlay = null;
				if ($container) {
					$container.querySelectorAll('.ocrext-text-overlay-word-wrapper span').forEach(s => s.remove());
				}
				return this;
			},
			show: function () {
				if (_isOverlayAvailable() && $container) {
					$container.classList.add('visible');
					const overlay = $container.querySelector('.ocrext-text-overlay');
					if (overlay) overlay.classList.add('visible');
				}
				return this;
			},
			hide: function () {
				if ($container) {
					$container.classList.remove('visible');
					const overlay = $container.querySelector('.ocrext-text-overlay');
					if (overlay) overlay.classList.remove('visible');
				}
				return this;
			},
			setTitle: function () {
				const title = document.querySelector('title, .ocrext-textoverlay-title');
				if (title) title.textContent = browser.i18n.getMessage('overlayTab');
				return this;
			},
			listenToBackgroundEvents: function () {
				browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
					if (sender.tab) return true;
					if (request.evt === 'init-overlay-tab') {
						this.setOverlayInformation(request.overlayInfo, request.canWidth, request.canHeight, request.imgDataURI, request.zoom);
						this.show();
						sendResponse({ farewell: 'init-overlay-tab:OK' });
						return true;
					}
				});
			}
		};
		_init();
		return _overlayInstance;
	};

	const body = document.body;
	if (body.getAttribute('data-ocrext-run')) {
		const textOverlay = TextOverlay();
		textOverlay.listenToBackgroundEvents();
		textOverlay.setTitle();
	}
	if (!body.getAttribute('data-ocrext-dialog')) {
		window.__copyFishHtmlDialog__ = htmlDialog();
		window.__copyFishHtmlDialog__.init();
	}

	window.__TextOverlay__ = TextOverlay;
}());
