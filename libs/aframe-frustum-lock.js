
      function aframeFrustumLockComponent(aframe, componentName = 'frustum-lock') {

        // From https://github.com/ngokevin/aframe-animation-component/blob/master/index.js#L176
        function getPropertyType(el, property) {
          const [compName, propName] = property.split('.');
          const component = el.components[compName] || aframe.components[compName];

          // Raw attributes
          if (!component) {
            return null;
          }

          if (propName) {
            return component.schema[propName].type;
          }

          return component.schema.type;
        }

        function isValidTypeOrThrow(element, propertyName, type) {
          const widthPropType = getPropertyType(element, propertyName);

          // null is a valid value (for raw attributes)
          if (widthPropType && widthPropType !== type) {
            throw new Error(`unable to update property ${propertyName}; not a ${type}`);
          }
        }

        function calculateFrustrumSize(cameraEl, depth) {
          const threeCamera = cameraEl.components.camera.camera;
          const height = 2 * Math.tan(threeCamera.fov * aframe.THREE.Math.DEG2RAD / 2) * depth;
          const width = height * threeCamera.aspect;
          return {width, height};
        }

        /**
         * Frustum Lock component for A-Frame.
         */
        aframe.registerComponent(componentName, {
          schema: {

            /**
             * @param {string} [widthProperty=width] - Once frustum width is
             * calculated, this property on the element will be given the value.
             */
            widthProperty: {default: 'width'},

            /**
             * @param {string} [heightProperty=width] - Once frustum height is
             * calculated, this property on the element will be given the value.
             */
            heightProperty: {default: 'height'},

            /**
             * @param {number} [depth=10] - Distance along the z-index to position the
             * entity once frustum size calculated.
             */
            depth: {default: 10},

            /**
             * @param {number} [throttleTimeout=100] - Frustum calculations are
             * performed on resize and enter/exit vr. This throttles the calculations
             * to every throttleTimeout milliseconds.
             */
            throttleTimeout: {default: 100},
          },

          /**
           * Set if component needs multiple instancing.
           */
          multiple: false,

          /**
           * Called once when component is attached. Generally for initial setup.
           */
          init() {
            this._attachedEventListener = false;
            this._waitingForCameraInit = false;

            this._doFrustumCalcs = (camera) => {
              const {width, height} = calculateFrustrumSize(camera, this.data.depth);

              aframe.utils.entity.setComponentProperty(this.el, this.data.widthProperty, width);
              aframe.utils.entity.setComponentProperty(this.el, this.data.heightProperty, height);
              this.el.setAttribute('position', `0 0 -${this.data.depth}`);
            };

            this._activeCameraListener = (event) => {
              this._waitingForCameraInit = false;
              this.el.sceneEl.removeEventListener('camera-set-active', this._activeCameraListener);
              this._doFrustumCalcs(event.detail.cameraEl);
            };

            this._attachEventListeners = () => {
              if (this._attachedEventListener) {
                return;
              }
              this._attachedEventListener = _.throttle(
                this._resizeEventListener,
                this.data.throttleTimeout
              );
              window.addEventListener('resize', this._attachedEventListener);
              this.el.sceneEl.addEventListener('enter-vr', this._attachedEventListener);
              this.el.sceneEl.addEventListener('exit-vr', this._attachedEventListener);
            };

            this._removeEventListeners = () => {
              if (!this._attachedEventListener) {
                return;
              }
              window.removeEventListener('resize', this._attachedEventListener);
              this.el.sceneEl.removeEventListener('enter-vr', this._attachedEventListener);
              this.el.sceneEl.removeEventListener('exit-vr', this._attachedEventListener);
              this._attachedEventListener.cancel();
              this._attachedEventListener = undefined;
            };

            this._resizeEventListener = () => {
              if (this._waitingForCameraInit) {
                return;
              }

              const cameraEl = this.el.sceneEl.systems.camera.activeCameraEl;

              // no active camera available. Let the update() function handle doing the
              // calculations in the future.
              if (!cameraEl) {
                return;
              }

              this._doFrustumCalcs(cameraEl);
            };
          },

          /**
           * Called when component is attached and when component data changes.
           * Generally modifies the entity based on the data.
           */
          update(oldData) {

            if (oldData.widthProperty !== this.data.widthProperty) {
              isValidTypeOrThrow(this.el, this.data.widthProperty, 'number');
            }

            if (oldData.heightProperty !== this.data.heightProperty) {
              isValidTypeOrThrow(this.el, this.data.heightProperty, 'number');
            }

            // Check the waiting flag so we don't accidentally do the calculations
            // over and over again
            if (!aframe.utils.deepEqual(oldData, this.data) && !this._waitingForCameraInit) {

              if (this.el.sceneEl.systems.camera.activeCameraEl) {

                // Active camera available, go straight to the calculations
                this._doFrustumCalcs(this.el.sceneEl.systems.camera.activeCameraEl);

              } else {

                // no active camera, so let's wait
                this._waitingForCameraInit = true;
                this.el.sceneEl.addEventListener('camera-set-active', this._activeCameraListener);

              }
            }
          },

          play() {
            this._attachEventListeners();
          },

          stop() {
            this._removeEventListeners();
          },

        });
      }
