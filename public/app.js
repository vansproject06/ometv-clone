
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const nextBtn = document.getElementById('nextBtn');
const statusText = document.getElementById('status');
const onlineCount = document.getElementById('onlineCount');
const loading = document.getElementById('loading');
const chatMessages = document.getElementById('chatMessages');

const chatInput = document.getElementById('chatInput');

const sendBtn = document.getElementById('sendBtn');

const connectSound = document.getElementById('connectSound');

const disconnectSound = document.getElementById('disconnectSound');

let localStream;
let peerConnection;

const ws = new WebSocket('wss://ometv-clone-px00.onrender.com');

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

    createPeerConnection();

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

    loading.style.display = 'block';

    statusText.innerText = 'Waiting for partner...';

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

    loading.style.display = 'none';

    statusText.innerText = 'Partner connected';

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

        statusText.innerText = 'Partner disconnected';

        loading.style.display = 'block';

        setTimeout(() => {

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
