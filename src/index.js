// Register AR component
AFRAME.registerComponent('ar-camera', {
  schema: { elid: {type:'string'} },
  init: function () {
    window.ARcamera = {};

    window.ARcamera.video_component = this.el;
    window.ARcamera.canvas = document.createElement('canvas');

    window.ARcamera.el_obj = document.getElementById(this.data.elid);

    window.ARcamera.detector = new AR.Detector();

    window.ARcamera.size_real = 400;
  },
  update: function(oldData){
    if (oldData.elid !== this.data.elid) {
      window.ARcamera.el_obj = document.getElementById(this.data.elid);
    }
  },
  tick: function(){
    if(typeof window.ARcamera.video == 'undefined'){
      if(window.ARcamera.video_component.getAttribute('src') != null){
        //TODO: can i detect the video id generated by a-video-billboard ?? I can generalize the component here
        window.ARcamera.video = document.getElementById(window.ARcamera.video_component.getAttribute('src').substr(1));
        window.ARcamera.canvas.width = window.ARcamera.video.videoWidth;
        window.ARcamera.canvas.height = window.ARcamera.video.videoHeight;
        window.ARcamera.context = window.ARcamera.canvas.getContext('2d');

        window.ARcamera.view_width = window.ARcamera.video_component.getAttribute('width'),
        window.ARcamera.view_heigth = window.ARcamera.video_component.getAttribute('height');
      }
    }else{
      window.ARcamera.context.drawImage(window.ARcamera.video, 0, 0, window.ARcamera.video.videoWidth, window.ARcamera.video.videoHeight);
      var imageData = window.ARcamera.context.getImageData(0,0,window.ARcamera.canvas.width,window.ARcamera.canvas.height);

      var markers = window.ARcamera.detector.detect(imageData);
      
      if(markers.length>0){
        var points = markers[0].corners;

        var position = calcIntersection(generateLine(points[0],points[2]), generateLine(points[1],points[3]));

        // Marker "only" x rotated
        if(Math.abs(calcAngle(points[0],points[1])) < Math.PI/8 && Math.abs(calcAngle(points[2],points[3])) < Math.PI/8){
          line_near = calcMax(generateLine(points[0],points[1]),generateLine(points[2],points[3]));
          line_far = calcMin(generateLine(points[0],points[1]),generateLine(points[2],points[3]));
          line_side1 = generateLine(points[1],points[2]);
          line_side2 = generateLine(points[3],points[0]);
        // Marker "only" x rotated
        }else if(Math.abs(calcAngle(points[1],points[2])) < Math.PI/8 && Math.abs(calcAngle(points[3],points[0])) < Math.PI/8){
          line_near = calcMax(generateLine(points[1],points[2]),generateLine(points[3],points[0]));
          line_far = calcMin(generateLine(points[1],points[2]),generateLine(points[3],points[0]));
          line_side1 = generateLine(points[0],points[1]);
          line_side2 = generateLine(points[2],points[3]);
        }else{ // TODO: other cases. e: 
          line_near = generateLine(points[1],points[2]);
          line_far = generateLine(points[3],points[0]);
          line_side1 = generateLine(points[0],points[1]);
          line_side2 = generateLine(points[2],points[3]);
        }
        line_final = line_near;// TODO: parallel line_near in point position insersect with line_side1,line_side2

        line_near_size = calcSize(line_near);
        x_final = (position.x*window.ARcamera.view_width/window.ARcamera.canvas.width)-window.ARcamera.view_width*.5;
        y_final = (position.y*window.ARcamera.view_heigth/window.ARcamera.canvas.height)-window.ARcamera.view_heigth*.5;
        z_final = window.ARcamera.size_real/line_near_size;
        // Distance correction
        y_final = y_final * Math.cos(Math.atan(y_final/z_final));
        x_final = x_final * Math.cos(Math.atan(x_final/z_final));
        
        z_rot = 180*calcAngle(getPoints(line_final)[0],getPoints(line_final)[1])/Math.PI;
        x_rot = 180*Math.atan((line_near_size-calcSize(line_side1))/line_near_size)/Math.PI;
        // Distance correction
        x_rot = x_rot + 180*Math.atan(y_final/z_final)/Math.PI;

        // Set position and rotation values
        var pos = window.ARcamera.el_obj.getAttribute('position');
        var rot = window.ARcamera.el_obj.getAttribute('rotation');
        pos.x = -x_final;
        pos.y = -y_final;
        pos.z = -z_final;

        rot.x = -x_rot;
        rot.z = z_rot;


        window.ARcamera.el_obj.setAttribute('position',pos);
        window.ARcamera.el_obj.setAttribute('rotation',rot);
      }
    }
  }
});
