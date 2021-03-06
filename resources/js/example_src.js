'use strict';

var achBatchContainer,
	addBatchButton,
	achBindie,
	achFile,
	achFileOutput,
	achForbject,
	Bindie = require('bindie'),
	classie = require('classie'),
	dummydata = require('./dummydata2'),
	expandButton,
	ejs = require('ejs'),
	forbject = require('forbject'),
	loadNachieFile,
	tsACHFileContainer,
	tsACHFileContainerTopPos,
	moment = require('moment'),
	nach = require('nach'),
	newACHBatch,
	newACHEntry,
	notification,
	optionalInputs,
	saveAs = require('filesaver.js'),
	StylieNotification = require('stylie.notifications'),
	utils = nach.Utils;

ejs.delimiter = '?';

var removeEmptyObjectValues = function (obj) {
	for (var property in obj) {
		if (typeof obj[property] === 'object') {
			removeEmptyObjectValues(obj[property]);
		}
		else {
			if (obj[property] === '' || obj[property] === ' ' || obj[property] === null || obj[property] === undefined || Object.keys(obj).length === 0) {
				delete obj[property];
			}
		}
	}
	return obj;
};

var showNotification = function (e) {
	notification = new StylieNotification({
		wrapper: document.querySelector('#ach'),
		message: e.type + ': ' + e.message,
		ttl: 6000,
		layout: 'growl',
		effect: 'jelly',
		type: 'notice'
	});
	notification.show();
};

var downloadACH = function () {
	var blob = new Blob([achFileOutput.innerHTML], {
		type: 'text/plain;charset=utf-8'
	});
	saveAs(blob, 'nACHa.txt');
	showNotification({
		type: 'File Saved',
		message: 'nACHa file saved'
	});
};
var saveACH = function () {
	var blob = new Blob([JSON.stringify(achFile, null, '  ')], {
		type: 'application/json;charset=utf-8'
	});
	saveAs(blob, 'nachie.json');
	showNotification({
		type: 'File Saved',
		message: 'Nachie file saved'
	});
};

var expandACHOutput = function () {
	if (classie.has(tsACHFileContainer, 'expanded')) {
		classie.remove(tsACHFileContainer, 'expanded');
		expandButton.innerHTML = 'expand';
	}
	else {
		classie.add(tsACHFileContainer, 'expanded');
		expandButton.innerHTML = 'collapse';
	}
};

var updateNachieOutput = function (achFile) {
	try {
		achFile.generateFile(function (fileString) {
			achFileOutput.innerHTML = fileString;
		});
		achBindie.update({
			data: {
				achFile: achFile
			}
		});
	}
	catch (e) {
		showNotification(e);
		console.error(e);
	}
};

var updateNachOnFormChange = function (data) {
	// console.log('updateNachOnFormChange data', data);
	try {
		achFile = new nach.File(data.file);
		if (data.batches) {
			for (var z in data.batches) {
				data.batches[z].effectiveEntryDate = moment(data.batches[z].effectiveEntryDate, 'YYMMDD').toDate();
				newACHBatch = new nach.Batch(data.batches[z]);

				if (data.batches[z].entries) {
					for (var y in data.batches[z].entries) {
						newACHEntry = new nach.Entry(data.batches[z].entries[y]);
						newACHBatch.addEntry(newACHEntry);
					}
				}
				achFile.addBatch(newACHBatch);
			}
		}
		updateNachieOutput(achFile);
	}
	catch (e) {
		showNotification(e);
		console.error(e);
	}
};


var getEntryValues = function (entryObject) {
	var returnEntryObject = {};
	for (var entryFieldProp in entryObject.fields) {
		returnEntryObject[entryFieldProp] = entryObject.fields[entryFieldProp].value;
	}
	return removeEmptyObjectValues(returnEntryObject);
};

var getBatchValues = function (batchObject) {
	var returnBatchObject = {},
		batchEntries = batchObject._entries || batchObject.entries;
	for (var batchHeaderProp in batchObject.header) {
		returnBatchObject[batchHeaderProp] = batchObject.header[batchHeaderProp].value;
	}
	if (batchEntries.length > 0) {
		returnBatchObject.entries = [];
		for (var d = 0; d < batchEntries.length; d++) {
			returnBatchObject.entries[d] = getEntryValues(batchEntries[d]);
		}
	}
	return removeEmptyObjectValues(returnBatchObject);
};

var addACHBatch = function () {
	var newACHBatch,
		nachieBatch = dummydata._batches[0];

	newACHBatch = new nach.Batch(nachieBatch);
	achFile.addBatch(newACHBatch);
	updateNachieOutput(achFile);
};

var achBatchContainerClickHandler = function (e) {
	var clickTarget = e.target,
		batchIndex, entryIndex,
		refreshOutput = function () {
			achForbject.refresh();
			updateNachOnFormChange(achForbject.getObject());
		};

	if (classie.has(clickTarget, 'remove-batch-button')) {
		batchIndex = clickTarget.getAttribute('data-batchIndex');
		achBatchContainer.removeChild(document.querySelector('#ach-batch-' + batchIndex));
		refreshOutput();
	}
	else if (classie.has(clickTarget, 'remove-batchentry-button')) {
		batchIndex = clickTarget.getAttribute('data-batchIndex');
		entryIndex = clickTarget.getAttribute('data-entryIndex');
		document.querySelector('#ach-batch-entrycontainer-' + batchIndex).removeChild(document.querySelector('#ach-batchentry-' + batchIndex + '-' + entryIndex));
		refreshOutput();
	}
	else if (classie.has(clickTarget, 'add-batch-entry-button')) {
		var nachieBatchEntry = dummydata._batches[0].entries[0];
		batchIndex = clickTarget.getAttribute('data-batchIndex');
		newACHEntry = new nach.Entry(nachieBatchEntry);
		achFile._batches[batchIndex].addEntry(newACHEntry);
		updateNachieOutput(achFile);
	}
};

var loadNachieFromObject = function (nachie) {
	// console.log('nachie', nachie);
	var data = {};

	try {
		for (var headerprop in nachie.header) {
			data[headerprop] = nachie.header[headerprop].value;
		}
		achFile = new nach.File(data);

		if (nachie._batches) {
			for (var z = 0; z < nachie._batches.length; z++) {
				nachie._batches[z] = getBatchValues(nachie._batches[z]);
				nachie._batches[z].effectiveEntryDate = moment(nachie._batches[z].effectiveEntryDate, 'YYMMDD').toDate();
				newACHBatch = new nach.Batch(nachie._batches[z]);
				if (nachie._batches[z].entries) {
					for (var y in nachie._batches[z].entries) {
						newACHEntry = new nach.Entry(nachie._batches[z].entries[y]);
						newACHBatch.addEntry(newACHEntry);
					}
				}
				achFile.addBatch(newACHBatch);
			}
		}
		//updateoutput
		updateNachieOutput(achFile);
	}
	catch (e) {
		showNotification(e);
		console.error(e);
	}
};

var loadNachieFileHandler = function () {
	var file = loadNachieFile.files[0],
		filereader = new FileReader(),
		fileJSON;
	filereader.readAsText(file);
	filereader.onload = function () {
		try {
			fileJSON = JSON.parse(filereader.result);
			loadNachieFromObject(fileJSON);

			showNotification({
				type: 'File Loaded',
				message: 'nACHa file loaded'
			});
		}
		catch (e) {
			showNotification(e);
			console.error(e);
		}
	};
};

var initEvents = function () {
	addBatchButton = document.querySelector('#add-batch-button');
	addBatchButton.addEventListener('click', addACHBatch, false);
	achBatchContainer = document.querySelector('#ach-file-batches');
	achBatchContainer.addEventListener('click', achBatchContainerClickHandler, false);
};

var moveACHFileOutput = function () {
	if (window.scrollY > tsACHFileContainerTopPos && !classie.has(tsACHFileContainer, 'ach-fix-top')) {
		classie.add(tsACHFileContainer, 'ach-fix-top');
	}
	else if (window.scrollY < tsACHFileContainerTopPos && classie.has(tsACHFileContainer, 'ach-fix-top')) {
		classie.remove(tsACHFileContainer, 'ach-fix-top');
	}
};

window.addEventListener('load', function () {
	achBindie = new Bindie({
		ejsdelimiter: '?',
		strictbinding: true
	});
	achBindie.addBinder({
		prop: 'achFile',
		elementSelector: '#achFile-container-binder',
		binderType: 'template',
		binderTemplate: document.querySelector('#ach-form-template').innerHTML,
		binderCallback: function ( /*cbdata*/ ) {
			achForbject.refresh();
			initEvents();
			// console.log('binderCallback cbdata', cbdata);
		}
	});
	achFileOutput = document.querySelector('#ach-file-output');
	achForbject = new forbject('#ach', {
		autorefresh: true,
		valuefilter: function (val) {
			if (typeof val === 'string') {
				return val.toUpperCase();
			}
			else {
				return val;
			}
		}
	});
	achForbject.on('autoRefreshOnValChange', updateNachOnFormChange);
	initEvents();
	expandButton = document.querySelector('#expand-button');
	expandButton.addEventListener('click', expandACHOutput, false);
	loadNachieFile = document.querySelector('#load-button');
	loadNachieFile.addEventListener('change', loadNachieFileHandler, false);
	optionalInputs = document.querySelectorAll('.ts-form-optional');
	tsACHFileContainer = document.querySelector('#ts-ach-file-container');
	tsACHFileContainerTopPos = tsACHFileContainer.getBoundingClientRect().top;
	document.querySelector('#download-button').addEventListener('click', downloadACH, false);
	document.querySelector('#save-button').addEventListener('click', saveACH, false);
	window.addEventListener('scroll', moveACHFileOutput, false);
	loadNachieFromObject(dummydata);
}, false);

window.achForbject = achForbject;
window.achFile = achFile;
