# HAPI Server Verifier

Runs a suite of tests on a HAPI server via a web interface or the command line. The tests involve a combination of [JSON schema](https://github.com/hapi-server/verifier-nodejs/tree/master/schemas) validation and ad-hoc code.

A running instance and example output is available at http://tsds.org/verify-hapi

To run tests from the command line or to run a server, see the below.

# Installation

Installation is only required if you do not want to test a server using http://tsds.org/verify-hapi

```
# Install Node Version Manager (NVM)
curl https://raw.githubusercontent.com/creationix/nvm/v0.33.2/install.sh | bash
# Install node.js 6
nvm install 6
# Clone repository
git clone https://github.com/hapi-server/verifier-nodejs.git
# Install required Node packages
cd verifier-nodejs; npm install
```

# Command-Line Usage

```
node verify.js 
	--url URL 
	--id DATASETID 
	--parameter PARAMETERNAME 
	--timemin HAPITIME 
	--timemax HAPITIME
```

If no arguments are provided, a web server is started on port 9999, which can be accessed at "http://localhost:9999/".  If `--url URL` is provided, then output goes to stdout and a web server is not started. See `verify.html` for documentation.

# Server Usage

```
node verify.js [--port PORT]
```
The default port is 9999. See http://localhost:9999/ for documentation.

# TODO

1. Add tests for HAPI Binary and HAPI JSON output formats (currently, only the first set of lines of CSV are tested).
2. Check that size of `bin.centers` and `bin.ranges` arrays are consistent with `size`.
3. Handle leap seconds.
4. Allow parameters `dataTimeout` and `metadataTimeout`?
5. Add stress test.

# Contact

Bob Weigel <rweigel@gmu.edu>
