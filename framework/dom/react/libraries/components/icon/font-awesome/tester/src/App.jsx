import "@fortawesome/fontawesome-svg-core/styles.css";
import { library } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAddressBook as faSolidAddressBook } from "@fortawesome/free-solid-svg-icons";
import { faAddressBook as faRegularAddressBook } from "@fortawesome/free-regular-svg-icons";
import { faAndroid } from "@fortawesome/free-brands-svg-icons";

library.add(faSolidAddressBook);
library.add(faRegularAddressBook);
library.add(faAndroid);

function App() {
  return (
    <main>
      <section>
        <h2>Add</h2>
        <ul>
          <li>
            <FontAwesomeIcon icon={faSolidAddressBook} />
          </li>
          <li>
            <FontAwesomeIcon icon={faRegularAddressBook} />
          </li>
          <li>
            <FontAwesomeIcon icon={faAndroid} />
          </li>
          <li>
            <FontAwesomeIcon icon="fa-solid fa-address-book" />
          </li>
          <li>
            <FontAwesomeIcon icon="fa-regular fa-address-book" />
          </li>
          <li>
            <FontAwesomeIcon icon="fa-brands fa-android" />
          </li>
        </ul>
      </section>
      <section>
        <h2>Style</h2>
        <ul>
          <li>
            <span>size: </span>
            <FontAwesomeIcon icon={faSolidAddressBook} size="xs" />
            <FontAwesomeIcon icon={faSolidAddressBook} size="lg" />
            <FontAwesomeIcon icon={faSolidAddressBook} size="6x" />
          </li>
          <li>
            <span>fixedWidth:</span>
            <FontAwesomeIcon icon={faSolidAddressBook} fixedWidth />
            <FontAwesomeIcon icon={faRegularAddressBook} fixedWidth />
            <FontAwesomeIcon icon={faAndroid} fixedWidth />
          </li>
          <li>
            <span>fotate:</span>
            <FontAwesomeIcon icon={faSolidAddressBook} rotation={90} />
            <FontAwesomeIcon icon={faSolidAddressBook} rotation={180} />
            <FontAwesomeIcon icon={faSolidAddressBook} rotation={270} />
          </li>
          <li>
            <span>animation:</span>
            <FontAwesomeIcon icon={faSolidAddressBook} beat />
            <FontAwesomeIcon icon={faSolidAddressBook} spin />
            <FontAwesomeIcon icon={faSolidAddressBook} bounce />
          </li>
        </ul>
      </section>
    </main>
  );
}

export default App;
