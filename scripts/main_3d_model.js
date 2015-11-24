var main3dModel = function () {
    'use strict';

    var video, canvas, context, imageData, detector, posit,
        renderer, scene, camera, animated_mesh,
        step = 0.0,
        animation,
        clock = new THREE.Clock(),
        modelSize = 0.12;//35.0; //millimeters

    clock.autoStart = true;

    function animate(skinnedMesh) {
        var materials = skinnedMesh.material.materials,
            k;

        for (k in materials) {
            materials[k].skinning = true;
        }
        animation = new THREE.Animation(skinnedMesh, skinnedMesh.geometry.animation);
        animation.play();
    }

    function createRendererAndScene() {
        scene = new THREE.Scene();
        //camera = new THREE.PerspectiveCamera( 75, video.width/video.height, 0.1, 1000 );
        camera = new THREE.PerspectiveCamera(40, canvas.width / canvas.height, 1, 1000);

        renderer = new THREE.WebGLRenderer({
            antialias	: true,
            alpha		: true
        });
        renderer.setSize(video.width, video.height);
        document.body.appendChild(renderer.domElement);

        var geometry = new THREE.BoxGeometry(1, 1, 1),
            material = new THREE.MeshLambertMaterial({color: 0x009900}),
            loader,
            light2;
        //var material = new THREE.MeshLambertMaterial( { map: THREE.ImageUtils.loadTexture('assets/Raptor/raptor.jpg')} );

        THREE.CrossDomainJSONLoader = function (showStatus) {
            THREE.JSONLoader.call(this, showStatus);
        };
            
        loader = new THREE.JSONLoader();
        //animated_mesh;

        loader.load('resources/models/figure/knight.js', function (geometry, materials) {
            var standard = new THREE.MeshLambertMaterial({color: 0x9999ff}),
                mats,
                mesh,
                scale;

            geometry.computeFaceNormals();
            geometry.computeVertexNormals();

            mats = new THREE.MeshFaceMaterial(materials);

            //mesh = new THREE.Mesh( geometry, mats);
            mesh = new THREE.SkinnedMesh(geometry, mats);

            mesh.position.x = 0;
            mesh.position.y = 0;
            mesh.position.z = 0;

            scale = 0.03;

            mesh.scale.x = scale;
            mesh.scale.y = scale;
            mesh.scale.z = scale;
            animated_mesh = mesh;

            animated_mesh.visible = false;

            console.log(animated_mesh);

            scene.add(animated_mesh);
            animate(animated_mesh);
        });

        camera.position.z = 5;

        light2 = new THREE.DirectionalLight(0xffffff, 1, 100000);
        light2.position.set(0, 0, 1);
        scene.add(light2);
    }
    
    function snapshot() {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    }

    function drawCorners(markers) {
        var corners, corner, i, j;

        context.lineWidth = 3;

        for (i = 0; i < markers.length; i += 1) {
            corners = markers[i].corners;

            context.strokeStyle = "red";
            context.beginPath();

            for (j = 0; j < corners.length; j += 1) {
                corner = corners[j];
                context.moveTo(corner.x, corner.y);
                corner = corners[(j + 1) % corners.length];
                context.lineTo(corner.x, corner.y);
            }

            context.stroke();
            context.closePath();

            context.strokeStyle = "green";
            context.strokeRect(corners[0].x - 2, corners[0].y - 2, 4, 4);
        }
    }

    function updateObject(object, rotation, translation) {
        object.scale.x = modelSize;
        object.scale.y = modelSize;
        object.scale.z = modelSize;

        object.rotation.x = -Math.asin(-rotation[1][2]);
        object.rotation.y = -Math.atan2(rotation[0][2], rotation[2][2]);
        object.rotation.z =  Math.atan2(rotation[1][0], rotation[1][1]);

        //object.rotation.x = -Math.atan2(rotation[0][2], rotation[2][2]);
        //object.rotation.y = -Math.asin(-rotation[1][2]);
        //object.rotation.z =  Math.atan2(rotation[1][0], rotation[1][1]);

        object.position.x = translation[0];
        object.position.y = translation[1];
        object.position.z = -translation[2];
    }
    
    function updateScene(markers) {
        var corners, corner, pose, i;

        if (markers.length > 0) {
            animated_mesh.visible = true;
            corners = markers[0].corners;

            for (i = 0; i < corners.length; i += 1) {
                corner = corners[i];
                corner.x = corner.x - (canvas.width / 2);
                corner.y = (canvas.height / 2) - corner.y;
            }

            pose = posit.pose(corners);

            updateObject(animated_mesh, pose.bestRotation, pose.bestTranslation);

            step += 0.025;
        } else {
            if (animated_mesh) {
                animated_mesh.visible = false;
            }
        }
    }

    function render() {
        var delta = 0.75 * clock.getDelta();
        THREE.AnimationHandler.update(delta);
        renderer.render(scene, camera);
    }

    function tick() {
        window.requestAnimationFrame(tick);
		
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            snapshot();

            var markers = detector.detect(imageData);
            drawCorners(markers);
            updateScene(markers);

            render();
        }
    }

    function init() {
        detector = new AR.Detector();
        detector.detect = function (image) {
            var qr_data;

            CV.grayscale(image, this.grey);
            CV.adaptiveThreshold(this.grey, this.thres, 2, 7);

            this.contours = CV.findContours(this.thres, this.binary);

            this.candidates = this.findCandidates(this.contours, image.width * 0.20, 0.05, 10);
            this.candidates = this.clockwiseCorners(this.candidates);
            this.candidates = this.notTooNear(this.candidates, 5);

            qr_data = find_QR(this.candidates);
            if (qr_data) {
                return [new AR.Marker(2, qr_data)];
            } else {
                return [];
            }
        };

        posit = new POS.Posit(modelSize, canvas.width);

        createRendererAndScene();

        window.requestAnimationFrame(tick);
    }

    function onLoad() {
        canvas = document.getElementById('canvas');
        video = document.getElementById('video');
        context = canvas.getContext('2d');

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
