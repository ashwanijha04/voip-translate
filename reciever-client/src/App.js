import React, { useState, useRef, useEffect } from 'react';
import './App.css';

const App = () => {
  const [peerConnection, setPeerConnection] = useState(null);
  const [candidateQueue, setCandidateQueue] = useState([]);
  const [messageQueue, setMessageQueue] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = new WebSocket('ws://localhost:8080');

    socketRef.current.onopen = () => {
      messageQueue.forEach((msg) => socketRef.current.send(JSON.stringify(msg)));
      setMessageQueue([]);
    };

    socketRef.current.onmessage = (message) => {
      const data = JSON.parse(message.data);
      if (data.offer) {
        handleOffer(data.offer);
      } else if (data.candidate) {
        handleCandidate(data.candidate);
      } else if (data.endCall) {
        handleRemoteEndCall();
      }
    };
  }, []);

  const handleOffer = async (offer) => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideoRef.current.srcObject = stream;
    setLocalStream(stream);

    const pc = createPeerConnection();
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    setPeerConnection(pc);

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    sendMessage({ answer });

    candidateQueue.forEach(async (candidate) => {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    });
    setCandidateQueue([]);
  };

  const handleCandidate = async (candidate) => {
    if (peerConnection) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } else {
      setCandidateQueue((prevQueue) => [...prevQueue, candidate]);
    }
  };

  const handleRemoteEndCall = () => {
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
      localVideoRef.current.srcObject = null;
    }

    remoteVideoRef.current.srcObject = null;
  };

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302',
        },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendMessage({ candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    return pc;
  };

  const sendMessage = (message) => {
    if (socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      setMessageQueue((prevQueue) => [...prevQueue, message]);
    }
  };

  const endCall = () => {
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
      localVideoRef.current.srcObject = null;
    }

    remoteVideoRef.current.srcObject = null;

    sendMessage({ endCall: true });
  };

  return (
    <div className="App">
      <h1>Receiver Client</h1>
      <video ref={localVideoRef} autoPlay playsInline muted className="local-video" />
      <video ref={remoteVideoRef} autoPlay playsInline className="remote-video" />
      <button onClick={endCall}>End Call</button>
    </div>
  );
};

export default App;
