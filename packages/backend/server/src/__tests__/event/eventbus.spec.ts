import { TestingModule } from '@nestjs/testing';
import ava, { TestFn } from 'ava';
import Sinon from 'sinon';

import { EventBus, metrics } from '../../base';
import { createTestingModule } from '../utils';
import { Listeners } from './provider';

export const test = ava as TestFn<{
  module: TestingModule;
  eventbus: EventBus;
  listener: Sinon.SinonSpy;
}>;

test.before(async t => {
  const m = await createTestingModule({
    providers: [Listeners],
  });
  const eventbus = m.get(EventBus);
  t.context.module = m;
  t.context.eventbus = eventbus;
  t.context.listener = Sinon.spy(m.get(Listeners), 'onTestEvent');
});

test.afterEach(() => {
  Sinon.reset();
});

test.after(async t => {
  await t.context.module.close();
});

test('should register event listener', t => {
  const { eventbus } = t.context;

  // @ts-expect-error private member
  t.true(eventbus.emitter.eventNames().includes('__test__.event'));

  eventbus.on('__test__.event2', () => {});
  // @ts-expect-error private member
  t.true(eventbus.emitter.eventNames().includes('__test__.event2'));
});

test('should dispatch event listener', t => {
  const { eventbus, listener } = t.context;

  const runtimeListener = Sinon.stub();
  const off = eventbus.on('__test__.event', runtimeListener);

  const payload = { count: 0 };
  eventbus.emit('__test__.event', payload);

  t.true(listener.calledOnceWithExactly(payload));
  t.true(runtimeListener.calledOnceWithExactly(payload));

  off();
});

test('should dispatch async event listener', async t => {
  const { eventbus, listener } = t.context;

  const runtimeListener = Sinon.stub().returns({ count: 2 });
  const off = eventbus.on('__test__.event', runtimeListener);

  const payload = { count: 0 };
  const returns = await eventbus.emitAsync('__test__.event', payload);

  t.true(listener.calledOnceWithExactly(payload));
  t.true(runtimeListener.calledOnceWithExactly(payload));

  t.deepEqual(returns, [{ count: 1 }, { count: 2 }]);

  off();
});

test('should record event handler call metrics', async t => {
  const { eventbus } = t.context;
  const timerStub = Sinon.stub(
    metrics.event.histogram('function_timer'),
    'record'
  );
  const counterStub = Sinon.stub(
    metrics.event.counter('function_calls'),
    'add'
  );

  await eventbus.emitAsync('__test__.event', { count: 0 });

  t.deepEqual(timerStub.getCall(0).args[1], {
    name: 'event_handler',
    event: '__test__.event',
    namespace: '__test__',
    error: false,
  });

  t.deepEqual(counterStub.getCall(0).args[1], {
    event: '__test__.event',
    namespace: '__test__',
  });

  Sinon.reset();

  await eventbus.emitAsync('__test__.throw', { count: 0 });

  t.deepEqual(timerStub.getCall(0).args[1], {
    name: 'event_handler',
    event: '__test__.throw',
    namespace: '__test__',
    error: true,
  });
});
