'use strict';

let height = 1080; // Это будет вычисляться на основе входящего потока
let width = 0;  // Этим создадим ширину фотографии
let cameras = []; // Список доступных камер

let streaming = false;  // streaming указывает на текущую активность видеопотока.

let video = null; // Будет содержать ссылку на элемент <video>  после загрузки страницы.

let wrapListCamera = null // Контейнер для списка камер
let wrapMainCamera = null; // Контейнер для основной камеры

window.addEventListener('load', function() {
  initVideoStream();
  videoControl();

  let canvasMetering = document.querySelector('.js-canvas-metering');
  createCanvasMetering(canvasMetering);
}, false);

// Инициализация видео потока
function initVideoStream() {
  wrapMainCamera = document.querySelector('.wrapper-main-camera');
  wrapListCamera = document.querySelector('.wrapper-list-camera');

  // Список доступных камер
  navigator.mediaDevices.enumerateDevices()
  .then(function(devices) {

    devices.forEach((device) => {
      if (device.kind == 'videoinput') {
        cameras.push(device);
      }
    });
    
    // Запуск доступных камер из списка
    startCameras(cameras, wrapListCamera);

    // Установка первой камеры из списка как главной
    let deviceId = cameras[0].deviceId;
    startMainCamera(deviceId, wrapMainCamera);
  })
  .catch(function(err) {
    console.log('An error occurred: ' + err);
  });

  wrapListCamera.addEventListener('click', onSelectedCamera);


  function onSelectedCamera(event) {
    let target = event.target;
    
    if (!target.nodeName == 'VIDEO') return;

    let deviceId = event.target.dataset.deviceId;
    startMainCamera(deviceId, wrapMainCamera);
  }
}

// Выбор основной камеры
function startMainCamera(deviceId, container) {
  
  let mainCamera = document.querySelector('.main-camera');

  if (mainCamera) {
    mainCamera.remove();
  }

  mainCamera = createStream(deviceId);
  mainCamera.classList.add('main-camera');

  container.append(mainCamera);
}

// Запуск камер по списку
function startCameras(cameras, container) {
  cameras.forEach(function(camera) {
    let video = createStream(camera.deviceId);
    video.classList.add('secondary-camera');
    container.append(video);
  });
}

// Возврат <video> по id камеры
function createStream(id) {
  let video = document.createElement('video');
  video.dataset.deviceId = id;

  // Получаем медиапоток
  navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      width: 1280,
      deviceId: id
    }
  })
  .then(function(stream) {
    video.srcObject = stream;
    video.play();
  })
  .catch(function(err) {
    console.log('An error occurred: ' + err);
  });

  return video;
}

// Управление видео
function videoControl() {
  let btnPause = document.querySelector('.js-btn-pause');
  let btnSave = document.querySelector('.js-btn-save');
  
  btnPause.onclick = function(event) {
    let video = document.querySelector('.main-camera');

    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }

  btnSave.onclick = function(event) {
    let video = document.querySelector('.main-camera');
    let canvas = document.createElement('canvas');
    let linkSave = document.createElement('a');

    canvas.height = 720;
    canvas.width = 1280;
    
    canvas.getContext("2d").drawImage(video, 0, 0);

    DownloadCanvasAsImage(canvas);
    linkSave.href = canvas.toDataURL('image/png');
  };

  function DownloadCanvasAsImage(canvas) {
    let downloadLink = document.createElement('a');
    downloadLink.setAttribute('download', 'CanvasAsImage.png');

    canvas.toBlob(function(blob) {
      
      if (!blob) return;

      let url = URL.createObjectURL(blob);
      downloadLink.setAttribute('href', url);
      downloadLink.click();
    });
  }
}


function createCanvasMetering(shell) {
  let point1, point2, line;

  let canvas = new fabric.Canvas(shell, {
    selection: false
  });

  fabric.Object.prototype.originX = fabric.Object.prototype.originY = 'center';

  canvas.on('mouse:down', function(e) {

    if (e.target) {
      return
    }

    let x = e.pointer.x;
    let y = e.pointer.y;

    if (!point1) {
      point1 = makeCircle(x, y);
      point1.name = 'point1';
      this.add(point1);
    } else {
      point2 = makeCircle(x, y);
      point2.name = 'point2';
      this.add(point2);
    }

    if (line) {
      point1 = point2 = line = null;
      this.clear();
    }

    if (point1 && point2) {
      line = makeLine([
        point1.left, point1.top, 
        point2.left, point2.top
      ]);

      line.pointBegin = point1;
      line.pointEnd = point2;

      this.add(line);
    }
  });

  canvas.on('object:moving', function(e) {
    
    if (!line) return;
    
    let p = e.target;
    let lineCoord;

    lineCoord = getLineCoords(line);
    
    if (p.name == 'point1') {
      line.set({'x1': p.left, 'y1': p.top});
      line.setCoords();
    }
    
    if (p.name == 'point2') {
      line.set({'x2': p.left, 'y2': p.top});
      line.setCoords();
    }

    if (p.get('type') == 'line') {
      point1.set({
        'left': lineCoord.x1,
        'top': lineCoord.y1
      }).setCoords();

      point2.set({
        'left': lineCoord.x2,
        'top': lineCoord.y2
      }).setCoords();

      line.set({
        'x1': lineCoord.x1, 'y1': lineCoord.y1,
        'x2': lineCoord.x2, 'y2': lineCoord.y2
      }).setCoords();
    }

    this.renderAll();
  });

  canvas.on('mouse:over', function(e) {
    let target = e.target;

    if (!target) {
      return;
    }
    
    target.set('stroke', 'red');
    this.renderAll();
  });

  canvas.on('mouse:out', function(e) {
    let target = e.target;

    if (!target) {
      return;
    }

    target.set('stroke', '#ffff00');
    this.renderAll();
  });

  function makeCircle(left, top) {
    let c = new fabric.Circle({
      left: left,
      top: top,
      strokeWidth: 2,
      radius: 6,
      fill: 'rgba(0,0,0,0)',
      stroke: 'red'
    });

    c.hasControls = c.hasBorders = false;

    return c;
  }

  function makeLine(coords) {
    return new fabric.Line(coords, {
      stroke: '#ffff00',
      strokeWidth: 2,
      hasBorders: false,
      hasControls: false,
      perPixelTargetFind: true,
      fill: '#ffff00'
    });
  }

  function getLineCoords(line) {
    const linePoints = line.calcLinePoints();
    const scaleX = line.scaleX || 1;
    const scaleY = line.scaleY || 1;

    let startCoords, endCoords, length;

    if ((line.flipY && line.flipX) || (!line.flipY && !line.flipX)) {
      startCoords = {
        x: line.left + linePoints.x1 * scaleX,
        y: line.top + linePoints.y1 * scaleY,
      };
      endCoords = {
        x: line.left + linePoints.x2 * scaleX,
        y: line.top + linePoints.y2 * scaleY,
      };
    } else {
      startCoords = {
        x: line.left + linePoints.x1 * scaleX,
        y: line.top + linePoints.y2 * scaleY,
      };
      endCoords = {
        x: line.left + linePoints.x2 * scaleX,
        y: line.top + linePoints.y1 * scaleY,
      };
    }

    length = Math.sqrt(
      Math.pow((endCoords.x - startCoords.x), 2)
      + Math.pow((endCoords.y - startCoords.y), 2)
    );

    return {
      x1: startCoords.x,
      y1: startCoords.y,
      x2: endCoords.x,
      y2: endCoords.y,
      length: length
    };
  }
};