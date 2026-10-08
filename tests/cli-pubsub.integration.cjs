/** Compatibilidad de la herramienta Firebase con Pub/Sub local. La app no usa Pub/Sub. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { once } = require('node:events');
const { Buffer } = require('node:buffer');
const projectId = 'demo-frescapp-security';
if (process.env.GCLOUD_PROJECT !== projectId || process.env.PUBSUB_EMULATOR_HOST !== '127.0.0.1:8085') {
  throw new Error('Esta prueba solo funciona con el emulador local y el proyecto demo.');
}
const desdeCLI = createRequire(require.resolve('firebase-tools/package.json'));
const { PubSub } = desdeCLI('@google-cloud/pubsub');
test('SDK de herramientas crea tema y suscripción, entrega mensaje y confirma su recepción', { timeout: 20000 }, async () => {
  const cliente = new PubSub({ projectId, apiEndpoint: process.env.PUBSUB_EMULATOR_HOST });
  const topic = cliente.topic(`frescapp-prueba-${Date.now()}`);
  let sub;
  let temporizador;
  try {
    await topic.create();
    [sub] = await topic.createSubscription('suscripcion-' + topic.name.split('/').at(-1));
    const [existe] = await topic.exists(); assert.equal(existe, true);
    const recepcion = once(sub, 'message');
    const limite = new Promise((_, rechazar) => { temporizador = setTimeout(() => rechazar(new Error('El mensaje no llegó al emulador.')), 10000); });
    const id = await topic.publishMessage({ data: Buffer.from('prueba-local'), attributes: { origen: 'frescapp-test' } });
    assert.equal(typeof id, 'string');
    const [mensaje] = await Promise.race([recepcion, limite]);
    assert.equal(mensaje.data.toString(), 'prueba-local'); assert.equal(mensaje.attributes.origen, 'frescapp-test');
    mensaje.ack();
  } finally {
    clearTimeout(temporizador);
    if (sub) { await sub.close(); await sub.delete(); }
    await topic.delete();
    await cliente.close();
  }
});
