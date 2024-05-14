import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import Peer from "peerjs";

let socket;
export const isProduction = import.meta.env.VITE_APP_NODE_ENV === "production";

function App() {
  const [peerId, setPeerId] = useState("");
  const [match, setMatch] = useState(null);
  const [stream, setStream] = useState(null);
  const [call, setCall] = useState(null);
  const [userData, setUserData] = useState({ username: "", interests: [] });
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);

  useEffect(() => {
    socket = io(import.meta.env.VITE_APP_BACKEND_URL);

    let peerOptions;

    if (!isProduction) {
      peerOptions = {
        host: "192.168.117.97",
        port: 5000,
        path: "/peerjs",
        secure: true,
      };
    } else {
      peerOptions = {
        host: "systemic-altruism-soulmegle-server.onrender.com",
        path: "/peerjs",
        secure: true,
      }
    }
    const peer = new Peer(peerOptions);
 
    peerRef.current = peer;

    peer.on("open", (id) => {
      setPeerId(id);
    });

    peer.on("call", handleIncomingCall);

    socket.on("connection", (socket) => {
      console.log("Connection established with socket:", socket.id);
    });

    socket.on("match-found", handleMatchFound);
    socket.on("no-match", handleNoMatch);

    return () => {
      if (peer) peer.disconnect();
      if (socket) socket.disconnect();
    };
  }, []);

  const handleIncomingCall = (incomingCall) => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        incomingCall.answer(stream);
        incomingCall.on("stream", (userVideoStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = userVideoStream;
          }
        });
      })
      .catch((err) => {
        console.error("Failed to get local stream", err);
      });
  };

  const handleMatchFound = ({ peerId: matchedPeerId, username }) => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        const outgoingCall = peerRef.current.call(matchedPeerId, stream);
        setCall(outgoingCall);
        outgoingCall.on("stream", (userVideoStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = userVideoStream;
          }
        });
        setMatch(username);
      })
      .catch((err) => {
        console.error("Failed to get local stream", err);
      });
  };

  const handleNoMatch = () => {
    alert("No match found. Please try again.");
  };

  const registerUser = () => {
    socket.emit("register", { ...userData, peerId });
  };

  const findMatch = () => {
    socket.emit("find-match", userData.interests, {
      username: userData.username,
      peerId,
    });
  };

  const nextMatch = () => {
    if (call) call.close();
    setMatch(null);
    findMatch();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
      <div className="w-full max-w-md p-4 bg-white shadow-md rounded-lg">
        {peerId && (
          <p className="text-center text-sm text-gray-500">Peer ID: {peerId}</p>
        )}
        <input
          className="w-full p-2 border border-gray-300 rounded mt-2"
          type="text"
          placeholder="Username"
          value={userData.username}
          onChange={(e) =>
            setUserData({ ...userData, username: e.target.value })
          }
        />
        <input
          className="w-full p-2 border border-gray-300 rounded mt-2"
          type="text"
          placeholder="Interests (comma separated)"
          value={userData.interests.join(", ")}
          onChange={(e) =>
            setUserData({ ...userData, interests: e.target.value.split(", ") })
          }
        />
        <div className="flex justify-between mt-4">
          <button
            className="bg-blue-500 text-white py-2 px-4 rounded"
            onClick={registerUser}
          >
            Register
          </button>
          <button
            className="bg-green-500 text-white py-2 px-4 rounded"
            onClick={findMatch}
          >
            Find Match
          </button>
          <button
            className="bg-red-500 text-white py-2 px-4 rounded"
            onClick={nextMatch}
          >
            Next
          </button>
        </div>
      </div>

      <div className="mt-6 w-full max-w-lg">
        <h3 className="text-lg text-center">Local Stream</h3>
        <video
          ref={localVideoRef}
          autoPlay
          muted
          className="w-full rounded shadow-md"
        ></video>
      </div>
      <div className="mt-6 w-full max-w-lg">
        <h3 className="text-lg text-center">Remote Stream</h3>
        <video
          ref={remoteVideoRef}
          autoPlay
          className="w-full rounded shadow-md"
        ></video>
      </div>

      {match && (
        <div className="mt-4 text-center text-lg">Connected with: {match}</div>
      )}
    </div>
  );
}

export default App;
