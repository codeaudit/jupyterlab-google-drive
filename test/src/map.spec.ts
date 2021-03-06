// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');


import {
  GoogleMap
} from '../../lib/realtime/map';

import {
  loadGapi, initializeGapi, DEFAULT_CLIENT_ID
} from '../../lib/gapi';

import {
  inMemoryModel
} from './util';

describe('GoogleMap', () => {
  let model: inMemoryModel;
  let map: gapi.drive.realtime.CollaborativeMap<number>;

  before((done) => {
    loadGapi().then(() => {
      initializeGapi(DEFAULT_CLIENT_ID).then(done);
    });
  });

  beforeEach(() => {
    model = new inMemoryModel();
    map = model.model.createMap<number>();
  });

  afterEach(() => {
    map.removeAllEventListeners();
    model.dispose();
  });

  describe('#constructor()', () => {

    it('should accept no arguments', () => {
      let value = new GoogleMap<number>(map);
      expect(value instanceof GoogleMap).to.be(true);
    });
  });

  describe('#type', () => {

    it('should return `Map`', () => {
      let value = new GoogleMap<number>(map);
      expect(value.type).to.be('Map');
    });
  });

  describe('#googleObject', () => {
    it('should get the CollaborativeObject associated with the list', () => {
      let value = new GoogleMap<number>(map);
      expect(value.googleObject).to.be(map);
    });

    it('should be settable', () => {
      let value = new GoogleMap<number>(map);
      let map2 = model.model.createMap<number>();
      map2.set('foo', 1);
      value.googleObject = map2;
      expect(value.get('foo')).to.be(1);
      map2.removeAllEventListeners();
    });

    it('should emit change signals upon being set', () => {
      let called1 = false;
      let called2 = false;
      let value = new GoogleMap<number>(map);
      value.set('foo', 1);
      let map2 = model.model.createMap<number>();
      map2.set('bar', 2);
      value.changed.connect((sender, args) => {
        expect(sender).to.be(value);
        if (args.type === 'add') {
          expect(args.key).to.be('bar');
          expect(args.oldValue).to.be(undefined);
          expect(args.newValue).to.be(2);
          called1 = true;
        }
        if (args.type === 'remove') {
          expect(args.key).to.be('foo');
          expect(args.oldValue).to.be(1);
          expect(args.newValue).to.be(undefined);
          called2 = true;
        }
      });
      value.googleObject = map2;
      expect(called1).to.be(true);
      expect(called2).to.be(true);
      map2.removeAllEventListeners();
    });

  });

  describe('#size', ()=>{
    it('should return the number of entries in the map', ()=>{
      let value = new GoogleMap<number>(map);
      value.set('one', 1);
      value.set('two', 2);
      expect(value.size).to.be(2);
    });
  });

  describe('#changed', () => {

    it('should be emitted when the map changes state', () => {
      let called = false;
      let value = new GoogleMap<number>(map);
      value.changed.connect(() => { called = true; });
      value.set("entry", 1);
      expect(called).to.be(true);
    });

    it('should have value changed args', () => {
      let called = false;
      let value = new GoogleMap<number>(map);
      value.changed.connect((sender, args) => {
        expect(sender).to.be(value);
        expect(args.type).to.be('add');
        expect(args.newValue).to.be(0);
        expect(args.oldValue).to.be(undefined);
        expect(args.key).to.be('entry');
        called = true;
      });
      value.set('entry', 0);
      expect(called).to.be(true);
    });

  });

  describe('#isDisposed', () => {

    it('should test whether the map is disposed', () => {
      let value = new GoogleMap<number>(map);
      expect(value.isDisposed).to.be(false);
      value.dispose();
      expect(value.isDisposed).to.be(true);
    });

  });

  describe('#dispose()', () => {

    it('should dispose of the resources held by the map', () => {
      let value = new GoogleMap<number>(map);
      value.set('one', 1);
      value.set('two', 2);
      value.dispose();
      expect(value.isDisposed).to.be(true);
    });

  });

  describe('#set()', () => {

    it('should set the item at a specific key', () => {
      let value = new GoogleMap<number>(map);
      value.set('one', 1);
      expect(value.get('one')).to.be(1);
    });

    it('should return the old value for that key', () => {
      let value = new GoogleMap<number>(map);
      value.set('one', 1);
      let x = value.set('one', 1.01);
      expect(x).to.be(1);
    });

    it('should trigger a changed signal', () => {
      let called = false;
      let value = new GoogleMap<number>(map);
      value.changed.connect((sender, args) => {
        expect(sender).to.be(value);
        expect(args.type).to.be('add');
        expect(args.newValue).to.be(1);
        expect(args.oldValue).to.be(undefined);
        expect(args.key).to.be('one');
        called = true;
      });
      value.set('one', 1);
      expect(called).to.be(true);
    });
  });

  describe('#get()', () => {
    it('should get the value for a key', ()=>{
      let value = new GoogleMap<number>(map);
      value.set('one', 1);
      expect(value.get('one')).to.be(1);
    });

    it('should return undefined if the key does not exist', ()=>{
      let value = new GoogleMap<number>(map);
      value.set('one', 1);
      expect(value.get('two')).to.be(undefined);
    });
  });

  describe('#has()', ()=>{
    it('should whether the key exists in a map', ()=>{
      let value = new GoogleMap<number>(map);
      value.set('one', 1);
      expect(value.has('one')).to.be(true);
      expect(value.has('two')).to.be(false);
    });
  });

  describe('#keys()', ()=>{
    it('should return a list of the keys in the map', ()=>{
      let value = new GoogleMap<number>(map);
      value.set('one', 1);
      value.set('two', 2);
      value.set('three', 3);
      let keys = value.keys();
      expect(keys).to.eql(['one', 'two', 'three']);
    });
  });

  describe('#values()', ()=>{
    it('should return a list of the values in the map', ()=>{
      let value = new GoogleMap<number>(map);
      value.set('one', 1);
      value.set('two', 2);
      value.set('three', 3);
      let keys = value.values();
      expect(keys).to.eql([1, 2, 3]);
    });
  });

  describe('#delete()', () => {

    it('should remove an item from the map', ()=>{
      let value = new GoogleMap<number>(map);
      value.set('one', 1);
      value.set('two', 2);
      value.set('three', 3);
      expect(value.get('two')).to.be(2);
      value.delete('two');
      expect(value.get('two')).to.be(undefined);
    });

    it('should return the value of the key it removed', ()=>{
      let value = new GoogleMap<number>(map);
      value.set('one', 1);
      expect(value.delete('one')).to.be(1);
      expect(value.delete('one')).to.be(undefined);
    });

    it('should trigger a changed signal', () => {
      let value = new GoogleMap<number>(map);
      value.set('one', 1);
      value.set('two', 2);
      value.set('three', 3);
      let called = false;

      value.changed.connect((sender, args) => {
        expect(sender).to.be(value);
        expect(args.type).to.be('remove');
        expect(args.key).to.be('two');
        expect(args.oldValue).to.be(2);
        expect(args.newValue).to.be(undefined);
        called = true;
      });
      value.delete('two');
      expect(called).to.be(true);
    });

  });

  describe('#clear()', () => {

    it('should remove all items from the map', () => {
      let value = new GoogleMap<number>(map);
      value.set('one', 1);
      value.set('two', 2);
      value.set('three', 3);
      value.clear();
      expect(value.size).to.be(0);
      value.clear();
      expect(value.size).to.be(0);
    });

    it('should trigger a changed signal', () => {
      let value = new GoogleMap<number>(map);
      value.set('one', 1);
      let called = false;
      value.changed.connect((sender, args) => {
        expect(sender).to.be(value);
        expect(args.type).to.be('remove');
        expect(args.key).to.be('one');
        expect(args.oldValue).to.be(1);
        expect(args.newValue).to.be(undefined);
        called = true;
      });
      value.clear();
      expect(called).to.be(true);
    });
  });
});
