import { ref, set, get, push } from "firebase/database";
import { firebaseAuth, firebaseDatabase } from "../firebase";

async function sendMessage() {
  const currentUser = firebaseAuth.currentUser;
  if (!currentUser) {
    throw new Error("Not login");
  }
  const messagesRef = ref(firebaseDatabase, `messages/${currentUser.uid}`);
  const messageRef = push(messagesRef);
  console.log(messageRef.key);
  set(messageRef, {
    // id,
    title: Date.now(),
  })
    .then(() => {
      if (messageRef.key) {
        localStorage.setItem("message.id", messageRef.key);
      }
    })
    .catch((error) => {
      console.log(error);
    });
}

// messages/AmLXLjcxc5NbUP760rRZffrvhbG2/-NSfniXQ3qJokE9Ro6Y6
function getMessage(p?: string) {
  const currentUser = firebaseAuth.currentUser;
  if (!currentUser) {
    throw new Error("Not login");
  }
  const id = localStorage.getItem("message.id");
  if (!id && !p) {
    throw new Error("No messages");
  }
  get(ref(firebaseDatabase, p ?? `messages/${currentUser.uid}/${id}`))
    .then((snapshot) => {
      if (snapshot.exists()) {
        console.log(snapshot.val());
      } else {
        console.log("No data available");
      }
    })
    .catch((error) => {
      console.error(error);
    });
}

export default {
  sendMessage,
  getMessage,
};
