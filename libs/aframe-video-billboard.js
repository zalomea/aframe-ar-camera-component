

      // for pausing promises when there is an inflight permission request
      let askingPermissionPromise = false;
      let hasPermission = false;

      function getVideoBySource(videoSource) {
        const constraints = {
          video: {
            deviceId: videoSource && videoSource.deviceId ? {exact: videoSource.deviceId} : undefined,
          },
        };

        return navigator.mediaDevices.getUserMedia(constraints);
      }

      function getRearFacingVideoSource() {

        return getDevices().then(sources => {

          if (!sources.length) {
            throw new Error('Could not find any video sources');
          }

          let rearVideoSource;

          sources.some(sourceInfo => {
            const labelLower = sourceInfo.label.toLowerCase();
            if (
              labelLower.indexOf('back') !== -1
              || labelLower.indexOf('environment') !== -1
              || labelLower.indexOf('rear') !== -1
            ) {
              rearVideoSource = sourceInfo;
              return true;
            }
            return false;
          });

          return rearVideoSource || sources[0];

        });

      }

      function getSourceByDeviceId(deviceId) {

        return getDevices().then(sources => {

          if (!sources.length) {
            throw new Error('Could not find any video sources');
          }

          return (
            sources.filter(sourceInfo => sourceInfo.deviceId === deviceId)[0]
            || sources[0]
          );

        });

      }

      function handleError(error) {
        // eslint-disable-next-line no-console
        console.error('navigator.getUserMedia error: ', error);
      }

      function askPermission() {

        // Already has permission, so resolve immediately
        if (hasPermission) {
          return Promise.resolve();
        }

        // There's already a permission request in flight
        // So return that promise (aka; queue up while we wait)
        if (askingPermissionPromise) {
          return askingPermissionPromise;
        }

        // Trigger an ask for permission dialog
        askingPermissionPromise = getVideoBySource().then(_ => {
          // Permission received! Nothing in flight, so remove reference to stored
          // promise
          askingPermissionPromise = null;
          hasPermission = true;
        });

        return askingPermissionPromise;
      }

      function getDevices() {
        return navigator.mediaDevices.enumerateDevices().then(sources => (
          sources.filter(source => source.kind === 'videoinput')
        ));
      }

      /**
       * @param deviceId {String|null} The device ID to get the stream for. If
       * omitted, will attempt to get the rear-facing video stream. If rear-facing
       * video stream not detected, will get the first video stream found.
       *
       * @return {source, stream}. source: MediaDeviceInfo. stream: MediaStream.
       */
      function getVideoStream(deviceId) {

        let streamPromise = askPermission();

        if (deviceId) {
          streamPromise = streamPromise.then(_ => getSourceByDeviceId(deviceId));
        } else {
          streamPromise = streamPromise.then(getRearFacingVideoSource);
        }

        return streamPromise
          .then(source => getVideoBySource(source).then(stream => ({source, stream})))
          .catch(handleError);
      }


      /**
       * @param aframe {Object} The Aframe instance to register with
       * @param componentName {String} The component name to use
       */
      function aframeVideoBillboardEntity(aframe, componentName) {

        window.AFRAME.registerPrimitive(`a-${componentName}`, window.AFRAME.utils.extendDeep({}, window.AFRAME.primitives.getMeshMixin(), {
          defaultComponents: {
            [componentName]: {},
            geometry: {
              primitive: 'plane',
            },
            material: {
              color: '#ffffff',
              shader: 'flat',
              side: 'both',
              transparent: true,
              width: 16,
              height: 9,
            },
          },

          mappings: {
            height: 'geometry.height',
            width: 'geometry.width',
          },
        }));

      }



      function createVideoElementAsAsset(id) {

        let video = document.querySelector(`#${id}`);

        if (!video) {
          video = document.createElement('video');
        }

        video.setAttribute('id', id);
        video.setAttribute('autoplay', true);
        video.setAttribute('src', '');

        let assets = document.querySelector('a-assets');

        if (!assets) {
          assets = document.createElement('a-assets');
          document.querySelector('a-scene').appendChild(assets);
        }

        if (!assets.contains(video)) {
          assets.appendChild(video);
        }

        return video;
      }

      function shrinkwrapMinDimensions(
        {width: minWidth, height: minHeight},
        {width, height}
      ) {

        const aspectRatio = width / height;

        // assume width is exact, and height is taller than minHeight
        let shrunkWidth = minWidth;
        let shrunkHeight = shrunkWidth / aspectRatio;

        if (shrunkHeight < minHeight) {
          // our assumption was wrong, so we need to grow the shrunk sizes to make
          // height exact
          shrunkHeight = minHeight;
          shrunkWidth = shrunkHeight * aspectRatio;
        }

        return {
          width: shrunkWidth,
          height: shrunkHeight,
        };
      }

      /**
       * @param aframe {Object} The Aframe instance to register with
       * @param componentName {String} The component name to use. Default: 'video-billboard'
       */
      function aframeVideoBillboardComponent(aframe, componentName) {

        /**
         * Draggable component for A-Frame.
         */
        aframe.registerComponent(componentName, {
          schema: {
            /*
             * @param {string} [deviceId=null] - Select the specific device for
             * display. Note that if it is not a valid video device, nothing will be
             * shown.
             */
            deviceId: {default: null},

            /*
             * @param {number} [minWidth=4] - The minimum width in world-units to
             * display the video at. Video aspect ratio will be preserved.
             */
            minWidth: {default: 4},

            /*
             * @param {number} [minHeight=3] - The minimum height in world-units to
             * display the video at. Video aspect ratio will be preserved.
             */
            minHeight: {default: 3},
          },

          /**
           * Called once when component is attached. Generally for initial setup.
           */
          init() {
            this._videoId = cuid();
            this._activeVideo = {
              source: null,
              stream: null,
            };
          },

          /**
           * Called when component is attached and when component data changes.
           * Generally modifies the entity based on the data.
           */
          update() {

            getVideoStream(this.data.deviceId).then(({source, stream}) => {

              this._activeVideo.soure = source;
              this._activeVideo.stream = stream;

              // Creating an aframe asset out of a new video tag
              const videoEl = createVideoElementAsAsset(this._videoId);
              const entityEl = this.el;

              const onLoadedMetaData = _ => {

                // Only want this event listener to execute once
                videoEl.removeEventListener('loadeddata', onLoadedMetaData);

                videoEl.play();

                // Pointing this aframe entity to that video as its source
                entityEl.setAttribute('src', `#${this._videoId}`);

                const {width, height} = shrinkwrapMinDimensions(
                  {width: this.data.minWidth, height: this.data.minHeight},
                  {width: videoEl.videoWidth, height: videoEl.videoHeight}
                );

                // Set the width and height correctly
                entityEl.setAttribute('width', width);
                entityEl.setAttribute('height', height);

                entityEl.emit('video-play', {source, stream});
              };

              videoEl.addEventListener('loadeddata', onLoadedMetaData);

              // And starting the video streaming
              videoEl.srcObject = stream;

              this._videoElement = videoEl;

            }).catch(error => {
              // TODO: Check error.name for 'PermissionDeniedError'?
              // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
              this.el.emit('video-permission-denied', {error});
            });
          },

          /**
           * Called when a component is removed (e.g., via removeAttribute).
           * Generally undoes all modifications to the entity.
           */
          remove() {
            if (this._videoElement) {
              this._videoElement.parentNode.removeChild(this._videoElement);
              this._videoElement = null;
            }
          },

          /**
           * Called when entity pauses.
           * Use to stop or remove any dynamic or background behavior such as events.
           */
          pause() {
            if (this._videoElement) {
              this._videoElement.pause();
            }
          },

          /**
           * Called when entity resumes.
           * Use to continue or add any dynamic or background behavior such as events.
           */
          play() {
            if (this._videoElement) {
              this._videoElement.play();
            }
          },

          getDevices() {
            return askPermission()
              .then(getDevices);
          },

          getActiveDevice() {
            return this.activeVideo.source;
          },
        });
      }



      function registerAframeVideoBillboard(
        aframe = window.AFRAME,
        componentName = 'video-billboard'
      ) {
        aframeVideoBillboardComponent(aframe, componentName);
        aframeVideoBillboardEntity(aframe, componentName);
      }