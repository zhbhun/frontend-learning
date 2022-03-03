import { NAMES, SENTENCES } from '../constants/dataset';

const chatHistory = (size) => {
  const chatHistory = [];

  for (let i = 0; i < size; i++) {
    const name = NAMES[Math.floor(Math.random() * NAMES.length)];
    const sentences = Math.ceil(Math.random() * 5);
    const texts = [];

    for (let x = 0; x < sentences; x++) {
      texts.push(SENTENCES[Math.floor(Math.random() * SENTENCES.length)]);
    }

    chatHistory.push({
      name,
      text: texts.join(' ')
    });
  }
  return chatHistory;
}

export default chatHistory;
