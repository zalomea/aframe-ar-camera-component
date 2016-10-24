function generateLine(point1, point2){
  return {x1:point1.x,y1:point1.y,x2:point2.x,y2:point2.y};
}

function getPoints(line){
  return [{x:line.x1,y:line.y1},{x:line.x2,y:line.y2}];
}

function calcDistance(point1, point2){
  return Math.sqrt(Math.pow(point2.x-point1.x,2)+Math.pow(point2.y-point1.y,2))
}

function calcSize(line){
  return Math.sqrt(Math.pow(line.x2-line.x1,2)+Math.pow(line.y2-line.y1,2))
}

function calcIntersection(line1, line2){
  var x=((line1.x1*line1.y2-line1.y1*line1.x2)*(line2.x1-line2.x2)-(line1.x1-line1.x2)*(line2.x1*line2.y2-line2.y1*line2.x2))/((line1.x1-line1.x2)*(line2.y1-line2.y2)-(line1.y1-line1.y2)*(line2.x1-line2.x2));
  var y=((line1.x1*line1.y2-line1.y1*line1.x2)*(line2.y1-line2.y2)-(line1.y1-line1.y2)*(line2.x1*line2.y2-line2.y1*line2.x2))/((line1.x1-line1.x2)*(line2.y1-line2.y2)-(line1.y1-line1.y2)*(line2.x1-line2.x2));
  return {x:x,y:y};
}

function calcMax(line1, line2){
  return (calcDistance({x:line1.x1,y:line1.y1},{x:line1.x2,y:line1.y2})<calcDistance({x:line2.x1,y:line2.y1},{x:line2.x2,y:line2.y2}))?line2:line1;
}
function calcMin(line1, line2){
  return (calcDistance({x:line1.x1,y:line1.y1},{x:line1.x2,y:line1.y2})>=calcDistance({x:line2.x1,y:line2.y1},{x:line2.x2,y:line2.y2}))?line2:line1;
}

function calcAngle(point1, point2){
  return Math.atan((point2.y-point1.y)/(point2.x-point1.x));
}

function calcPolygonArea(vertices) {
  var total = 0;

  for (var i = 0, l = vertices.length; i < l; i++) {
    var addX = vertices[i].x;
    var addY = vertices[i == vertices.length - 1 ? 0 : i + 1].y;
    var subX = vertices[i == vertices.length - 1 ? 0 : i + 1].x;
    var subY = vertices[i].y;

    total += (addX * addY * 0.5);
    total -= (subX * subY * 0.5);
  }

  return Math.abs(total);
}
