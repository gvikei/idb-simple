/* eslint no-console: 0 */

import 'colors';
import express from 'express';
import httpProxy from 'http-proxy';
import ip from 'ip';
import path from 'path';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { match, RouterContext } from 'react-router';

import Root from './src/Root';
import routes from './src/Routes';

import metadata from './generate-metadata';

const development = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 8080;

const app = express();
app.set('trust proxy', true);

if (development) {
  const proxy = httpProxy.createProxyServer();
  const webpackPort = process.env.WEBPACK_DEV_PORT;

  const target = `http://${ip.address()}:${webpackPort}`;
  Root.assetBaseUrl = target;

  app.get('/assets/*', (req, res) => {
    proxy.web(req, res, { target });
  });

  proxy.on('error', (e) => {
    console.log('Could not connect to webpack proxy'.red);
    console.log(e.toString().red);
  });

  console.log('Prop data generation started:'.green);

  metadata().then((props) => {
    console.log('Prop data generation finished:'.green);
    Root.propData = props;

    app.use((req, res) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods','GET, POST, PATCH, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, X-Auth-Token, X-Requested-With');
      res.header('Access-Control-Expose-Headers', 'Access-Token, Uid');

      const location = req.url;
      match({ routes, location }, (error, redirectLocation, renderProps) => {
        const html = ReactDOMServer.renderToString(
          <RouterContext {...renderProps} />,
        );
        res.send(`<!doctype html>${html}`);
      });
    });
  });
} else {
  app.use(express.static(path.join(__dirname, '../dev-built')));
}

app.listen(port, () => {
  console.log('Server started at:');
  console.log(`- http://localhost:${port}`);
  console.log(`- http://${ip.address()}:${port}`);
});
