import { createFrameworkMapController } from './scenes/framework-map-scene.js';
import { setPressed, setText } from './shared-ui.js';

const profileButtons = Array.from(document.querySelectorAll('[data-profile]'));

const controller = createFrameworkMapController({
  host: document.getElementById('map-host'),
  onSnapshot(profile) {
    setText('profile-position', profile.position);
    setText('profile-create', profile.create);
    setText('profile-update', profile.update);
    setText('profile-loop', profile.loop);
    setText('profile-events', profile.events);
    setText('profile-resource', profile.resource);
    setText('profile-fit', profile.fit);
  }
});

profileButtons.forEach((button) => {
  button.addEventListener('click', () => {
    controller.setProfile(button.dataset.profile);
    setPressed(profileButtons, button.dataset.profile, 'profile');
  });
});

controller.setProfile('vanilla');
