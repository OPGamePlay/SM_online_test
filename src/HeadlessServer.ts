// This file is the entrypoint for the headless server and must set globalThis.headless
// to true to denote that there is no graphics nor audio code
globalThis.headless = true;
import * as Sentry from "@sentry/node";
import { CaptureConsole as CaptureConsoleIntegration } from "@sentry/integrations";

// Importing @sentry/tracing patches the global hub for tracing to work.
import "@sentry/tracing";
import { version } from '../package.json';
const release = `spellmasons@${version}`;
Sentry.init({
    dsn: "https://4cf64a58d4aa4fa4959212aeccd3d6a1@o4504650001874944.ingest.sentry.io/4504650012819456",
    release,
    integrations: [new CaptureConsoleIntegration(
        {
            // array of methods that should be captured
            // defaults to ['log', 'info', 'warn', 'error', 'debug', 'assert']
            levels: ['error']
        }
    )],
    // We recommend adjusting this value in production, or using tracesSampler
    // for finer control
    tracesSampleRate: 0.2,
});
Sentry.setTag("SpellmasonsRunner", "HeadlessServer");

import './Shims';
// Setup mods
import SpellmasonsAPI from './api';
globalThis.SpellmasonsAPI = SpellmasonsAPI;
import './SpellmasonsMods.cjs.js';

import { IHostApp, onClientPresenceChanged } from './network/networkUtil';
import { onData } from './network/networkHandler';
import makeOverworld, { Overworld } from "./Overworld";
import Underworld from "./Underworld";
const pie = require('@websocketpie/server');
globalThis.SPELLMASONS_PACKAGE_VERSION = version;
// Init underworld so that when clients join they can use it as the canonical
// record of gamestate
const PORT = process.env.PORT || 8080;
// hostApp (headless server) is always the host
globalThis.isHost = () => true;
// Headless does not includee a player of it's own, it's just the host
globalThis.player = undefined;
globalThis.numberOfHotseatPlayers = 1;

function headlessStartGame() {
    console.log('Headless Server Started at port ', PORT);
    pie.startServer({
        port: PORT, allowStats: true, makeHostAppInstance: () => {
            const hostAppInst = new HostApp();
            console.log('Start Game: Attempt to start the game')
            console.log('Host: Start game / Initialize Underworld');
            if (hostAppInst.overworld.underworld) {
                // Generate the level data
                hostAppInst.overworld.underworld.lastLevelCreated = hostAppInst.overworld.underworld.generateLevelDataSyncronous(0);
                // Actually create the level 
                hostAppInst.overworld.underworld.createLevelSyncronous(hostAppInst.overworld.underworld.lastLevelCreated);
            } else {
                console.error('hostApp overworld does not have an underworld to initialize.');
            }
            return hostAppInst;
        }
    });
    process.send?.({ running: true });
}


// Copied from @websocketpie/client
// @websocketpie/client is only meant for the browser so it shall not be imported
// in the node-only HeadlessServer
interface OnDataArgs {
    type: string;
    subType: string;
    fromClient: string;
    payload: any;
    time: number;
}
class HostApp implements IHostApp {
    isHostApp: boolean = true;
    // HostApp should have the Spellmasons version to ensure the clients and server are running the same version
    version = version;
    // Automatically overridden when passed into pie.startServer
    sendData: (msg: string) => void = () => { };
    overworld: Overworld;
    constructor() {
        this.overworld = makeOverworld(this);
        new Underworld(this.overworld, this.overworld.pie, Math.random().toString());
    }
    onData(data: any) {
        onData(data, this.overworld);
    }
    cleanup() {
    }
    // The host will receive all data that is send from a client
    // to the @websocketpie/server
    handleMessage(message: OnDataArgs) {
        switch (message.type) {
            case MessageType.Data:
                if (this.onData) {
                    this.onData(message);
                }
                break;
            case MessageType.ResolvePromise:
                // const funcNameForResolve = message.func as keyof typeof this.promiseCBs;
                // const promiseCbRes = this.promiseCBs[funcNameForResolve];
                // if (promiseCbRes) {
                //     promiseCbRes.resolve(message.data);
                // }
                break;
            case MessageType.RejectPromise:
                // const funcNameForReject = message.func as keyof typeof this.promiseCBs;
                // const promiseCbRej = this.promiseCBs[funcNameForReject];
                // if (promiseCbRej) {
                //     promiseCbRej.reject(message.err);
                // }
                break;
            case MessageType.ServerAssignedData:
                // this.clientId = message.clientId;
                // if (this.onServerAssignedData) {
                //     this.onServerAssignedData(message);
                // }
                break;
            case MessageType.ClientPresenceChanged:
                onClientPresenceChanged(message as any, this.overworld);
                // this._updateDebugInfo(message);
                // // If client is accepting the onClientPresenceChanged callback,
                // // send the message to it
                // if (this.onClientPresenceChanged) {
                //     this.onClientPresenceChanged(message);
                // }
                break;
            case MessageType.Rooms:
                // if (this.onRooms) {
                //     this.onRooms(message);
                // }
                break;
            case MessageType.Err:
                console.error(message);
                break;
            default:
                console.log(message);
                console.error(`Above message of type ${message.type} not recognized!`);
        }
    }
}
// Copied from PieClient
const MessageType = {
    // Both client and server:
    Data: 'Data',
    // Server to client:
    Rooms: 'Rooms',
    ClientPresenceChanged: 'ClientPresenceChanged',
    ServerAssignedData: 'ServerAssignedData',
    Err: 'Err',
    ResolvePromise: 'ResolvePromise',
    RejectPromise: 'RejectPromise',
    // Client to Server:
    JoinRoom: 'JoinRoom',
    LeaveRoom: 'LeaveRoom',
    GetRooms: 'GetRooms',
    // Unique to PieClient
    ConnectInfo: 'ConnectInfo',
};


headlessStartGame();