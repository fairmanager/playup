#!/usr/bin/env node
const Upload = require( "./lib/upload" );
const fs     = require( "fs" );
const fmLog  = require( "fm-log" );

const argParser = require( "yargs" )
	.usage( "Usage: $0 [options]" )
	.demand( 1 )
	.option( "t", {
		alias : "track",
		type : "string",
		default : "alpha"
	} )
	.option( "a", {
		alias : "auth",
		describe : "JSON file that contains private key and client email",
		demand : true
	} )
	.option( "v", {
		alias : "verbose",
		type : "boolean",
		default : false
	} )
	.help( "h" );

function run( argv ) {
	const apk = argv._[ 0 ];

	const upload = new Upload( fs.readFileSync( argv.auth ) );


	if( !argv.verbose ) {
		fmLog.logFactory.require( fmLog.LogLevels.INFO );
	}

	if( argv.track ) {
		upload.track = argv.track;
	}

	return upload.publish( apk )
		.catch( err => {
			// eslint-disable-next-line no-console
			console.error( err.stack );
			process.exit( 1 );
		} );
}

run( argParser.argv );
