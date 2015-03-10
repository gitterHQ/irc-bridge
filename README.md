# Gitter IRC Bridge

[![Join the chat at https://gitter.im/gitterHQ/irc-bridge](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/gitterHQ/irc-bridge?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Connect to Gitter using the IRC protocol.

## Configuring your client

You can connect to the **official** Gitter IRC bridge at:

 - host: `irc.gitter.im`
 - port: `6667` (or `6697`)

**SSL is mandatory**

You'll need to provide a valid token to authenticate yourself. You can send your token to the server using the `/PASS` command. If you use a GUI client, this is the Server Password; your client will send it automatically on connection.

You can obtain your token from https://irc.gitter.im

You can also find instructions on [how to configure specific clients in the Wiki](https://github.com/gitterHQ/irc-bridge/wiki/Client-configuration)

## Running the bridge locally

You'll need a working Node.js environment.

 * Install the dependencies with: `npm install`
 * Start the server with: `DEBUG=irc* npm start`

## Contributing

 * Fork the project.
 * Make your feature addition or bug fix.
 * Add tests for it. This is important so I don't break it in a future version unintentionally.
 * Add documentation if necessary.
 * Commit. Do not mess with the version or history.
 * Send a Pull Request! :+1:
