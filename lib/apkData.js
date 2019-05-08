"use-strict";

const fs        = require( "fs" );
const apkParser = require( "node-apk-parser" );

class ApkData {

	constructor( data, file ) {
		this.manifest = data;
		this.file     = file;
	}

	getStream() {
		return fs.createReadStream( this.file );
	}


	/**
	 * @param {string} apk
	 */
	static parseAPK( apk ) {
		try {
			const reader = apkParser.readFile( apk );
			return new ApkData( reader.readManifestSync() );
		} catch( innerError ) {
			const error = new Error( "Error parsing apk" );
			error.inner = innerError;
			throw error;
		}
	}
}


module.exports = ApkData;
