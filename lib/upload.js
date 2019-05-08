"use-strict";
const log        = require( "fm-log" ).module();
const assert     = require( "assert" );
const gapis      = require( "googleapis" );
const googleAuth = gapis.google.auth;

const ApkData = require( "./apkdata" );

const validTracks = [ "alpha", "beta", "production", "rollout" ];

class Upload {
	/**
	 * @param {string} json
	 */
	constructor( json ) {

		this.client       = googleAuth.fromJSON( json );
		this.client.scope = [ "https://www.googleapis.com/auth/androidpublisher" ];

		this.publisher = gapis.google.androidpublisher( "v3" );

		/**
		 * @type {"alpha"|"beta"|"production"|"rollout"}
		 */
		this.__track = "alpha";
	}

	/**
	 * @param {this.client}
	 */
	set auth( value ) {
		this.publisher.context._options.auth = value;
	}
	get auth() {
		return this.publisher.context._options.auth;
	}

	/**
	 * @param {this.__track}
	 */
	set track( value ) {
		assert( validTracks.indexOf( value ) !== -1, "Unknown track" );
		this.__track = value;
	}
	get track() {
		return this.__track;
	}

	/**
	 * @param {string} apk
	 */
	publish( apk ) {

		/**
		 * @type {ApkData}
		 */
		let apkData = null;

		try {
			apkData = ApkData.parseAPK( apk );
		} catch( error ) {
			log.error( "apk parsing error" );
			log.error( error );
		}

		return this.client.authorize()
			.then( auth => this.auth = auth )
			.then( () => this.createEdit( apkData ) )
			.then( () => this.uploadAPK( apkData ) )
			.then( () => this.assignTrack( apkData ) )
			.then( () => this.commitChanges( apkData ) )
			.then( () => apkData.manifest );
	}

	/**
	 * @param {ApkData} apkData
	 */
	createEdit( apkData ) {
		log.notice( "Creating edit" );

		const editPayload = {
			packageName : apkData.manifest.package
		};

		return this.publisher.edits
			.insert( editPayload )
			.then( response => {
				const edit = response.data;
				if( !edit ) {
					throw new Error( "Unable to create edit" );
				}
				log.notice( `Created edit with id ${edit.id}` );
				return edit;
			} );
	}

	/**
	 * @param {ApkData} apkData
	 */
	uploadAPK( apkData ) {

		log.notice( "Uploading release" );

		const apkPayload = {
			packageName : apkData.manifest.package,
			editId : this.editId,
			media : {
				mimeType : "application/vnd.android.package-archive",
				body : apkData.getStream()
			}
		};

		return this.publisher.edits.apks
			.upload( apkPayload )
			.then( upload => {
				log.notice( `Uploaded ${apkData.file}${"\n"
				}with version code ${upload.versionCode}${"\n"
				}and SHA1 ${upload.binary.sha1}` );
				return null;
			} );
	}

	/**
	 * @param {ApkData} apkData
	 */
	assignTrack( apkData ) {

		const trackPayload = {
			packageName : apkData.manifest.package,
			editId : this.editId,
			track : this.track,
			resource : {
				versionCodes : [ apkData.manifest.versionCode ]
			}
		};

		return this.publisher.edits.tracks
			.update( trackPayload )
			.then( track => {
				log.notice( `Assigned APK to ${track.track} track` );
				return track;
			} );
	}

	/**
	 * @param {ApkData} apkData
	 */
	commitChanges( apkData ) {
		log.notice( "Commiting changes" );

		const commitPayload = {
			editId : this.editId,
			packageName : apkData.manifest.package
		};

		return this.publisher.edits
			.commit( commitPayload )
			.then( () => {
				log.notice( "Commited changes" );
				return null;
			} );
	}
}

module.exports = Upload;
