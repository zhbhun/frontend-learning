import { ref, set, get } from "firebase/database";
import { firebaseDatabase } from "../firebase";

function getTimestamp() {
  get(ref(firebaseDatabase, "timestamp"))
    .then((snapshot) => {
      if (snapshot.exists()) {
        console.log(snapshot.val());
        alert(snapshot.val());
      } else {
        console.log("No data available");
      }
    })
    .catch((error) => {
      console.error(error);
      alert(error.message);
    });
}

function setTimestamp() {
  set(ref(firebaseDatabase, "timestamp"), String(Date.now()))
    .then(() => {
      console.log("Set successfully");
    })
    .catch((error) => {
      console.log(error);
    });
}

export default {
  getTimestamp,
  setTimestamp,
};
