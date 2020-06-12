// THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.

import {
  ethereum,
  JSONValue,
  TypedMap,
  Entity,
  Bytes,
  Address,
  BigInt
} from "@graphprotocol/graph-ts";

export class AnswerUpdated extends ethereum.Event {
  get params(): AnswerUpdated__Params {
    return new AnswerUpdated__Params(this);
  }
}

export class AnswerUpdated__Params {
  _event: AnswerUpdated;

  constructor(event: AnswerUpdated) {
    this._event = event;
  }

  get current(): BigInt {
    return this._event.parameters[0].value.toBigInt();
  }

  get answerId(): BigInt {
    return this._event.parameters[1].value.toBigInt();
  }
}

export class ChainlinkUSDETHOracleI extends ethereum.SmartContract {
  static bind(address: Address): ChainlinkUSDETHOracleI {
    return new ChainlinkUSDETHOracleI("ChainlinkUSDETHOracleI", address);
  }
}