import {
  createContext,
  ReactNode,
  useEffect,
  useState,
  useRef,
  RefObject,
} from "react"
import { io } from "socket.io-client"
import Peer, { Instance } from "simple-peer"

interface SocketContextProviderProps {
  children: ReactNode
}

interface SocketContextData {
  stream: MediaStream | undefined
  call: ICall | undefined
  me: string
  callAccepted: boolean
  callEnded: boolean
  name: string
  myVideo: RefObject<HTMLVideoElement>
  userVideo: RefObject<HTMLVideoElement>
  answerCall: () => void
  callUser: (id: string) => void
  leaveCall: () => void
  setName: (name: string) => void
}

interface ICall {
  isReceivingCall: boolean
  from: string
  name: string
  signal: string
}

const SocketContext = createContext({} as SocketContextData)

const socket = io("https://web-rtc-video-be.onrender.com/")
//Use on Localhost const socket = io("http://localhost:5000/")

function SocketProvider({ children }: SocketContextProviderProps) {
  const [stream, setStream] = useState<MediaStream>()
  const [call, setCall] = useState<any>({})
  const [me, setMe] = useState("")
  const [callAccepted, setCallAccepted] = useState(false)
  const [callEnded, setCallEnded] = useState(false)
  const [name, setName] = useState("")

  const myVideo = useRef<HTMLVideoElement>({} as HTMLVideoElement)
  const userVideo = useRef<HTMLVideoElement>({} as HTMLVideoElement)
  const connectionRef = useRef<Instance>()

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream)

        myVideo.current.srcObject = currentStream

        console.log(myVideo.current.srcObject)
      })

    socket.on("me", (id) => setMe(id))

    socket.on("callUser", ({ from, name: callerName, signal }) => {
      setCall({ isReceivingCall: true, from, name: callerName, signal })
    })
  }, [])

  function answerCall() {
    setCallAccepted(true)

    const peer = new Peer({ initiator: false, trickle: false, stream })

    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: call.from })
    })

    peer.on("stream", (currentStream) => {
      userVideo.current.srcObject = currentStream
    })

    peer.signal(call.signal)

    connectionRef.current = peer
  }

  function callUser(id: string) {
    const peer = new Peer({ initiator: true, trickle: false, stream })

    peer.on("signal", (data) => {
      socket.emit("callUser", {
        userToCall: id,
        signalData: data,
        from: me,
        name,
      })
    })

    peer.on("stream", (currentStream) => {
      userVideo.current.srcObject = currentStream
    })

    socket.on("callAccepted", (signal) => {
      setCallAccepted(true)

      peer.signal(signal)
    })

    connectionRef.current = peer
  }

  function leaveCall() {
    setCallEnded(true)
    connectionRef.current?.destroy()

    window.location.reload()
  }

  return (
    <SocketContext.Provider
      value={{
        stream,
        call,
        me,
        callAccepted,
        callEnded,
        name,
        setName,
        myVideo,
        userVideo,
        answerCall,
        callUser,
        leaveCall,
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}

export { SocketContext, SocketProvider }
