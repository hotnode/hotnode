# hotnode
Keep your application always available even during upgrades

## How to
This little server will proxy your application from an input port to an output port.

The config will be reloaded once per minute (you can edit this delay with "ttl" property in config.json).

When you upgrade you app, do it in a dupplicate directory then start your upgraded app on a new port.
Then, when started, edit config.json and replace the input port with the new port.
One minute later your app is up-to-date and nobody the users will not see any interruption.

# Example
Host your app in /home/app/first

Run it on http://localhost:8000.

Host HotNode on /home/hotnode

Run HotNode on port 80:
```bash
PORT=80 node server.js
```

To edit your app without interrupt the service, copy the node app code in /home/app/second.

Run it on http://localhost:8001

Then edit /home/hotnode/config.json as below:
```json
{
  "master": "http://localhost:8001",
  "ttl": 60
}
```

One minute later check the change on http://localhost:80.
If it's OK, you can now update /home/app/first
then change back config.json to proxy http://localhost:8000

And you're ready for next upgrade.
