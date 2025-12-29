# NTRIP nodes for node-red
[![Platform](https://img.shields.io/badge/platform-Node--RED-red)](https://nodered.org)
![License](https://img.shields.io/github/license/windkh/node-red-contrib-ntrip.svg)
[![NPM](https://img.shields.io/npm/v/node-red-contrib-ntrip?logo=npm)](https://www.npmjs.org/package/node-red-contrib-ntrip)
[![Known Vulnerabilities](https://snyk.io/test/npm/node-red-contrib-ntrip/badge.svg)](https://snyk.io/test/npm/node-red-contrib-ntrip)
[![Downloads](https://img.shields.io/npm/dm/node-red-contrib-ntrip.svg)](https://www.npmjs.com/package/node-red-contrib-ntrip)
[![Total Downloads](https://img.shields.io/npm/dt/node-red-contrib-ntrip.svg)](https://www.npmjs.com/package/node-red-contrib-ntrip)
[![Package Quality](http://npm.packagequality.com/shield/node-red-contrib-ntrip.png)](http://packagequality.com/#?package=node-red-contrib-ntrip)
[![Open Issues](https://img.shields.io/github/issues-raw/windkh/node-red-contrib-ntrip.svg)](https://github.com/windkh/node-red-contrib-ntrip/issues)
[![Closed Issues](https://img.shields.io/github/issues-closed-raw/windkh/node-red-contrib-ntrip.svg)](https://github.com/windkh/node-red-contrib-ntrip/issues?q=is%3Aissue+is%3Aclosed)
...

# Thanks for your donation
If you want to support this free project. Any help is welcome. You can donate by clicking one of the following links:

<a target="blank" href="https://blockchain.com/btc/payment_request?address=1PBi7BoZ1mBLQx4ePbwh1MVoK2RaoiDsp5"><img src="https://img.shields.io/badge/Donate-Bitcoin-green.svg"/></a>
<a target="blank" href="https://www.paypal.me/windkh"><img src="https://img.shields.io/badge/Donate-PayPal-blue.svg"/></a>

<a href="https://www.buymeacoffee.com/windka" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" height="41" width="174"></a>


This package contains nodes for connecting to a NTRIP server. 

# Installation
[![NPM](https://nodei.co/npm/node-red-contrib-ntrip.png?downloads=true)](https://nodei.co/npm/node-red-contrib-ntrip/)

You can install the nodes using node-red's "Manage palette" in the side bar.

Or run the following command in the root directory of your Node-RED installation

    npm install node-red-contrib-ntrip --save

# Dependencies
This package depends on the following libraries
- [@gnss/nmea](https://github.com/node-ntrip/nmea)
- [@gnss/rtcm](https://github.com/node-ntrip/rtcm)
- [ntrip-client](https://github.com/dxhbiz/ntrip-client)


# Credits

# 👥 Contributors

<p align="center">
  <a href="https://github.com/windkh/node-red-contrib-ntrip/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=windkh/node-red-contrib-ntrip" />
  </a>
</p>

# Changelog
Changes can be followed [here](/CHANGELOG.md)

# NTRIP Client Node
This node connects to a NTRIP caster and can be used in two different modes:
- upload
- download

## Download Mode
### Configuration
For downloading data from a NTRIP caster you need to provide the following information
- __host__ - the IP address or hostname of the NTRIP server (e.g. rtk2go.com)
- __port__ - the Port number of the NTRIP server (usually this is 2101)
- __mountpoint__ - the mountpoint of the stream data at the NTRIP server (enter name without /)

Depending on the version of the NTRIP caster you need to provide
- __username__ - the username (e.g. your e-mail address when using rtk2go.com)
- __password__ - the password (e.g. none)

Some NTRIP casters only send data after the client provided its location via a GGA sentence. 
In this case you can provide the X Y Z coordinate here or inject it like illustrated in the example flow
- __X__ - the X coordinate
- __Y__ - the Y coordinate
- __Z__ - the Z coordinate
- __interval__ - the interval in milliseconds to transmit the location to the NTRIP server.

### Provide Client Location (XYZ) to NTRIP caster
If you want more control about sending your location to the NTRIP server, then you
can inject the values as described in the following example:
![Alt text](images/SetXYZFlow.png?raw=true "SetXYZ Flow")  

The function node simply creates an array of X Y Z coordinates in msg.payload.
Sapos NTRIP casters for example only needs one GGA sentence to initiate streaming.

![Alt text](images/SetXYZFunctionNode.png?raw=true "SetXYZ Function Node")  
See also example flow [**SetXYZ flow**](examples/sapos.json)  

## Upload Mode
### Configuration
The configuation properties are the same as described for the download mode.
You need to provide these additional properties:
- __Authentication Mode__ - the mode the NTRIP caster accepts.
- __Pass through data__ - if checked all data is sent to the output for further processing.

### Authentication Modes
#### Legacy
This mode initiates the uploading to a mountpoint using plan text.
```javascript
SOURCE ${mountpoint}\r\n\r\n
```
or with password and unsername
```javascript
SOURCE ${password} /${mountpoint}\r\nSource-Agent: NTRIP ${username}\r\n\r\n
```

#### Legacy (Basic Auth)
This hybrid mode initiates the uploading to a mountpoint using plan text and Basic Auth.
```javascript
SOURCE ${mountpoint}\r\nAuthorization: Basic ${authorization}\r\n\r\n
```

#### NTRIP V1
This mode initiates the uploading to a mountpoint using HTTP with Basic Auth.
```javascript
POST /${mountpoint} HTTP/1.0\r\nUser-Agent: NTRIP ${userAgent}\r\nAuthorization: Basic ${authorization}\r\nContent-Type: gnss/data\r\n\r\n
```

#### NTRIP V2
THis mode is equal to NTRIP V1 with some more data.
```javascript
POST /${mountpoint} HTTP/1.1\r\nHost: ${host}:${port}\r\nUser-Agent: NTRIP ${userAgent}\r\nAuthorization: Basic ${authorization}\r\nNtrip-Version: Ntrip/2.0\r\nContent-Type: gnss/data\r\nConnection: keep-alive\r\n\r\n
```

# RTCM Decoder Node
This node accepts binary RTCM data. The node accepts either a single or multiple RTCN messages.
The converted messages are sent one by one to the output in the following format.
```javascript
msg.payload = 
{
    rtcm, // RTCm message number
    messageType, // a string indicating a readyble RTCM message name
    message, // a structure containing all decoded data
    input, // the raw input message
};
```

# NMEA Decoder Node
This node accepts binary NMEA data. The node accepts either a single or multiple NMEA messages.
The converted messages are sent one by one to the output in the following format.
```javascript
msg.payload = 
{
    messageType, // a string indicating a readyble RTCM message name
    message, // a structure containing all decoded data
    input, // the raw input message
};
```

# Examples 
Examples are stored in the examples folder an can be imported from within node-red's sidebar via import.

## Download data from NTRIP caster
Consuming Data is straight forward. Connect to a NTRIP caster, select download mode and
pass the data to other nodes for further processing: in this example 2 decoder are used.
The NMEA node is only to show that the stream can be split.
(It is useless as RTK2Go does not send any NMEA strings)
See also example flow [**RTK2Go flow**](examples/ntripclient.json)  

## Provide XYZ dato to NTRIP caster 
This example is the same as the RTK2Go one except for the fact that Sapos requires sending a GGA sentence 
before transmitting RTCM sentences.
See also example flow [**Sapos flow**](examples/sapos.json)  

## Consume data from TCP source (RTKBase)
Next to retrieving data from a remote NTRIP caster you can also consume the RTCM stream from a local
TCP source like a RTKBase Station (e.g. https://github.com/Stefal/rtkbase).
You can upload the data to any NTRIP caster like Onocoy, Centipede, RTKOnline, ... and use the same data
on your own. To accomplish this you can use node-red's TCP receiver node. 
You need to activate a TCP server either on your ESP32 XBee or RTKBase.
See also example flow [**TCP flow**](examples/tcp.json)  

## Upload data to NTRIP caster
Uploading is straight forward, however authentication might be tricky.
You need to know the mountpoint and credentials before you can initiat an upload.
Not all NTRIP casters accept the same way of authentication. You can test with 
a local demo version of SNIP by creating a raw TCP input stream.
(SNIP can be found here https://www.use-snip.com)
See also example flow [**Upload flow**](examples/upload.json)

# License

Author: Karl-Heinz Wind

The MIT License (MIT)
Copyright (c) 2025 by Karl-Heinz Wind

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
