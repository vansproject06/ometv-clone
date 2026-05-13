
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const nextBtn = document.getElementById('nextBtn');
const cameraBtn = document.getElementById('cameraBtn');

const muteBtn = document.getElementById('muteBtn');
const startBtn = document.getElementById('startBtn');

const loader = document.getElementById('loader');

const stopBtn = document.getElementById('stopBtn');

const startScreen = document.getElementById('startScreen');
const statusText = document.getElementById('status');
const onlineCount = document.getElementById('onlineCount');
const loading = document.getElementById('loading');
const chatMessages = document.getElementById('chatMessages');

const chatInput = document.getElementById('chatInput');

const sendBtn = document.getElementById('sendBtn');

const connectSound = document.getElementById('connectSound');

const disconnectSound = document.getElementById('disconnectSound');

nextBtn.style.display = 'none';

stopBtn.style.display = 'none';

let localStream;

let usingFrontCamera = true;

let micMuted = false;

let peerConnection;

const ws = new WebSocket(`wss://${window.location.host}`);

ws.onopen = () => {
    console.log('WebSocket Connected');
};

ws.onerror = (err) => {
    console.log('WebSocket Error', err);
};

const configuration = {

    iceServers:[

        {
            urls:'stun:stun.l.google.com:19302'
        },

        {
            urls:'turn:openrelay.metered.ca:80',
            username:'openrelayproject',
            credential:'openrelayproject'
        },

        {
            urls:'turn:openrelay.metered.ca:443',
            username:'openrelayproject',
            credential:'openrelayproject'
        }

    ]

};

async function startMedia(){

    localStream = await navigator.mediaDevices.getUserMedia({
        video:true,
        audio:true
    });

    localVideo.srcObject = localStream;

}

startMedia();

function createPeerConnection(){

    peerConnection = new RTCPeerConnection(configuration);

    localStream.getTracks().forEach(track => {

        peerConnection.addTrack(track, localStream);

    });

    peerConnection.onicecandidate = event => {

        if(event.candidate){

            ws.send(JSON.stringify({

                type:'ice-candidate',
                candidate:event.candidate

            }));

        }

    };

    peerConnection.ontrack = event => {

        console.log('REMOTE STREAM RECEIVED');

        remoteVideo.srcObject = event.streams[0];

    };

}

async function createOffer(){

    const offer = await peerConnection.createOffer();

    await peerConnection.setLocalDescription(offer);

    ws.send(JSON.stringify({

        type:'offer',
        offer:offer

    }));

}

ws.onmessage = async event => {

    const message = JSON.parse(event.data);

    if(message.type === 'online-count'){

    onlineCount.innerText = `${message.count} users online`;

}

if(message.type === 'waiting'){

    nextBtn.disabled = true;

    nextBtn.innerText = 'SEARCHING...';

    loading.style.display = 'block';

    statusText.innerText = 'Waiting for partner...';

}

if(message.type === 'partner-disconnected'){

    if(peerConnection){

    peerConnection.close();

    peerConnection = null;

}
    statusText.innerText = 'Partner disconnected';

}

if(message.type === 'chat'){

    chatMessages.innerHTML += `

        <div style="margin-bottom:10px; text-align:left;">

            <span style="
                background:#333;
                padding:10px 15px;
                border-radius:15px;
                display:inline-block;
                color:white;
            ">
                ${message.text}
            </span>

        </div>

    `;

    chatMessages.scrollTop = chatMessages.scrollHeight;

}

   if(message.type === 'matched'){

    loader.style.display = 'none';

    startScreen.style.display = 'none';

nextBtn.style.display = 'block';

stopBtn.style.display = 'block';

    nextBtn.disabled = false;

    nextBtn.innerText = 'NEXT';

    createPeerConnection();

    loading.style.display = 'none';

    statusText.innerText = 'Partner connected';

    chatInput.disabled = false;

sendBtn.disabled = false;

chatMessages.innerHTML = '';

    if(connectSound){

    connectSound.play().catch(() => {});

}

    if(message.initiator){

        setTimeout(() => {

            createOffer();

        },1000);

    }

}

    else if(message.type === 'offer'){

        await peerConnection.setRemoteDescription(
            new RTCSessionDescription(message.offer)
        );

        const answer = await peerConnection.createAnswer();

        await peerConnection.setLocalDescription(answer);

        ws.send(JSON.stringify({

            type:'answer',
            answer:answer

        }));

    }

    else if(message.type === 'answer'){

        await peerConnection.setRemoteDescription(
            new RTCSessionDescription(message.answer)
        );

    }

    else if(message.type === 'ice-candidate'){

        try{

            await peerConnection.addIceCandidate(
                new RTCIceCandidate(message.candidate)
            );

        }catch(err){

            console.error(err);

        }

    }

    else if(message.type === 'partner-disconnected'){

        nextBtn.disabled = true;

        nextBtn.innerText = 'SEARCHING...';

        statusText.innerText = 'Partner disconnected';

        loading.style.display = 'block';

        chatMessages.innerHTML = '';

chatInput.disabled = true;

sendBtn.disabled = true;

        setTimeout(() => {

            if(peerConnection){

    peerConnection.close();

    peerConnection = null;

    remoteVideo.srcObject = null;

}

    ws.send(JSON.stringify({

        type:'next'

    }));

},1000);

        if(disconnectSound){

    disconnectSound.play().catch(() => {});

}

        remoteVideo.srcObject = null;

    }

};

sendBtn.onclick = () => {

    if (!peerConnection) return;

    const text = chatInput.value;

    if(text.trim() === '') return;

    // tampilkan chat sendiri
    chatMessages.innerHTML += `

        <div style="margin-bottom:10px; text-align:right;">

            <span style="
                background:#ff2e63;
                padding:10px 15px;
                border-radius:15px;
                display:inline-block;
            ">
                ${text}
            </span>

        </div>

    `;

    // kirim ke partner
    ws.send(JSON.stringify({

        type:'chat',
        text:text

    }));

    chatInput.value = '';

    chatMessages.scrollTop = chatMessages.scrollHeight;

};

nextBtn.onclick = () => {

    nextBtn.disabled = true;

setTimeout(() => {

    nextBtn.disabled = false;

}, 2000);

statusText.innerText = 'Searching for new partner...';

    // stop peer lama
    if(peerConnection){

        peerConnection.close();

    }

    // kosongkan remote video
    remoteVideo.srcObject = null;

    // buat peer baru
    createPeerConnection();

    // cari partner baru
    ws.send(JSON.stringify({

        type:'next'

    }));

    statusText.innerText = 'Searching for partner...';

    loading.style.display = 'block';

};

startBtn.onclick = () => {

    startScreen.style.display = 'none';

    loader.style.display = 'block';

    nextBtn.style.display = 'block';

    stopBtn.style.display = 'block';

    ws.send(JSON.stringify({
        type:'next'
    }));

}

stopBtn.onclick = () => {

    if(peerConnection){

        peerConnection.close();

        peerConnection = null;

    }

    remoteVideo.srcObject = null;

    nextBtn.style.display = 'none';

    stopBtn.style.display = 'none';

    startScreen.style.display = 'flex';

    statusText.innerText = 'Press start to begin';

}

muteBtn.onclick = () => {

    micMuted = !micMuted;

    localStream
        .getAudioTracks()[0]
        .enabled = !micMuted;

    muteBtn.innerText = micMuted
        ? '🔇'
        : '🎤';

}

cameraBtn.onclick = async () => {

    usingFrontCamera = !usingFrontCamera;

    // stop kamera lama
    localStream.getTracks().forEach(track => track.stop());

    // ambil kamera baru
    const newStream = await navigator.mediaDevices.getUserMedia({

        video:{
            facingMode: usingFrontCamera
                ? 'user'
                : { exact:'environment' }
        },

        audio:true

    });

    // ganti video local
    localVideo.srcObject = newStream;

    // replace track ke partner
    const videoTrack = newStream.getVideoTracks()[0];

    const sender = peerConnection
        .getSenders()
        .find(s => s.track.kind === 'video');

    if(sender){

        await sender.replaceTrack(videoTrack);

    }

    localStream = newStream;

}