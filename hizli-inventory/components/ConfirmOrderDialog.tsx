'use client';

import {useState} from 'react';
import Modal from './Modal';
import type {Order, Fulfilment} from '@/lib/types';

/** Delivery or Collection — the two ways an order leaves the warehouse. */
export default function ConfirmOrderDialog({order, onClose, onConfirm}: {
  order: Order;
  onClose: () => void;
  onConfirm: (fulfilment: Fulfilment) => void;
}) {
  const [choice, setChoice] = useState<Fulfilment>(order.channel === 'Warehouse' ? 'Collection' : 'Delivery');

  return <Modal title={`Confirm ${order.orderNumber}`} onClose={onClose}>
    <form className="stack" onSubmit={e => { e.preventDefault(); onConfirm(choice); }}>
      <p className="muted" style={{marginTop: 0}}>
        {order.qty} × {order.title} <span style={{whiteSpace: 'nowrap'}}>({order.sku})</span>
      </p>

      <fieldset className="choice-group">
        <legend className="field">How is this order going out?</legend>

        <label className={'choice' + (choice === 'Delivery' ? ' selected' : '')}>
          <input type="radio" name="fulfilment" value="Delivery" checked={choice === 'Delivery'} onChange={() => setChoice('Delivery')}/>
          <span>
            <b>Delivery</b>
            <span className="muted"> — posted or couriered out to the customer. Use this for eBay, Vinted, Facebook and website orders.</span>
          </span>
        </label>

        <label className={'choice' + (choice === 'Collection' ? ' selected' : '')}>
          <input type="radio" name="fulfilment" value="Collection" checked={choice === 'Collection'} onChange={() => setChoice('Collection')}/>
          <span>
            <b>Collection</b>
            <span className="muted"> — the customer picks it up from the warehouse or buys in store.</span>
          </span>
        </label>
      </fieldset>

      <div className="notice" style={{fontSize: 13}}>
        Confirming removes {order.qty} unit{order.qty > 1 ? 's' : ''} from physical stock and clears the
        reservation. The order status becomes <b>{choice}</b>.
      </div>

      <div className="row" style={{justifyContent: 'flex-end', gap: 10}}>
        <button className="btn secondary" type="button" onClick={onClose}>Back</button>
        <button className="btn" type="submit">Confirm as {choice}</button>
      </div>
    </form>
  </Modal>;
}
