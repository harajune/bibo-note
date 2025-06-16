import { handler } from './index';

const testEvent = {
  pathParameters: {
    uuid: 'test-uuid'
  },
  headers: {
    'x-forwarded-host': 'harajune.bibo-note.jp'
  }
};

console.log('Testing OGP handler...');
handler(testEvent).then(result => {
  console.log('Result:', result);
}).catch(error => {
  console.error('Error:', error);
});
