var mainVideo = function () {
    'use strict';
    var video, canvas, context, imageData, detector, posit,
        element;

    function snapshot() {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    }

    function tick() {
        window.requestAnimationFrame(tick);

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            snapshot();

            var markers = detector.detect(imageData);
            /////////////////
            if (markers.length > 0) { //if we detected marker
                var idx = [0, 1, 3, 2], //correct order of marker vertices for pinned corners function
                    corners = [],
            //we arrange marker corners in idx order and map from video to window coordinates
                    rect = video.getBoundingClientRect(),
                    i;

                for (i = 0; i < 4; i += 1) {
                    corners.push(markers[0].corners[idx[i]]);
                    //corners[i].x = rect.left + corners[i].x;
                    //corners[i].y = rect.top + corners[i].y;
                }

                pinСorners(element, corners[0].x, corners[0].y, corners[1].x, corners[1].y, corners[2].x, corners[2].y, corners[3].x, corners[3].y);
                element.style.visibility = "visible";
            } else {
                element.style.visibility = "hidden";
            }
        }
    }

    function init() {
        detector = new AR.Detector();
        detector.detect = function (image) {
            CV.grayscale(image, this.grey);
            CV.adaptiveThreshold(this.grey, this.thres, 2, 7);

            this.contours = CV.findContours(this.thres, this.binary);

            this.candidates = this.findCandidates(this.contours, image.width * 0.20, 0.05, 10);
            this.candidates = this.clockwiseCorners(this.candidates);
            this.candidates = this.notTooNear(this.candidates, 5);

            var qr_data = find_QR(this.candidates);
            if (qr_data) {
                return [new AR.Marker(2, qr_data)];
            } else {
                return [];
            }
        };
        //posit = new POS.Posit(modelSize, canvas.width);
        window.requestAnimationFrame(tick);
    }

    function onLoad() {
        canvas = document.getElementById('canvas');
        video = document.getElementById('video');
        context = canvas.getContext('2d');
        element = document.getElementById('pinned-corners-video');


        if (!window.URL) {
            window.URL = window.URL || window.webkitURL || window.msURL || window.oURL;
        }

        if (!navigator.getUserMedia) {
            navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
                    navigator.mozGetUserMedia || navigator.msGetUserMedia;
        }

        window.navigator.getUserMedia({
            video: true,
            audio: false
        }, function (stream) {
            try {
                video.src = window.URL.createObjectURL(stream);
                init();
            } catch (err) {
                video.src = stream;
            }
        }, function () {
            throw new Error('Cannot capture user camera.');
        });
    }

    window.onload = onLoad;
}();
