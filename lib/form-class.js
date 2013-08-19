/**
 * Module dependencies.
 */
var validatorsLib    = require('validator').validators
	, Filter           = require('validator').Filter
	, filter           = new Filter
	, errorDictionnary = require('./errorDictionnary');

/* module.exports */
exports = module.exports = FormClass = function () {};

/**
 *
 *
 *
 * @param {Array|String}   fieldsToValidate
 * @param {Boolean=}       removeMode
 * @return {FormClass}
 * @api public
 */
FormClass.prototype.setValidationGroup = function (fieldsToValidate, removeMode) {
	// The validationGroup Array is created when the Form is instantiated
  // (with all fields by default).

	var formFieldsKeys = Object.keys(this.__proto__.fields);

	if (typeof fieldsToValidate === 'string') {
		// Remove useless whitespace(s)
		fieldsToValidate = fieldsToValidate.replace(/\s{2,}/, ' ')
																			 .replace(/^\s/, '')
																			 .replace(/\s$/, '')
																			 .split(' ');

    // If the given string begins by a dash, we validate all fields but those
    // listed in the string
		if (fieldsToValidate[0] === '-') {
			removeMode = true;
			fieldsToValidate.slice(1);
		}
	}

	if ( !! removeMode) {
		this.validationGroup = formFieldsKeys.filter(function (fieldProperty) {
			return !~ fieldsToValidate.indexOf(fieldProperty);
		});
	}
	else this.validationGroup = fieldsToValidate;

	return this;
}


/**
 *  Launch the sanitization and validation of each fields.
 *  Trigger flashes of inputs and errors in session if options enabled.
 *
 * @param {Object}             requestParams
 * @param {Array=|String=}     fieldsToValidate
 * @param {Boolean=}           removeMode
 * @return {FormClass}
 * @api public
 */
FormClass.prototype.handle = function (req) {
	this.errors = {}; // reset form errors

	this.requestValues = copyRequestValuesOfValidationGroup.call(this, req);

	for (var key in this.validationGroup) { // for each field to validate
		var fieldName = this.validationGroup[key];

		if ( ! this.fields.hasOwnProperty(fieldName)) {
		 throw new Error('FormFactory error => No "'
											+ fieldName + '" element defined in the form');
		}

		// if some filters are defined for this field
		if (this.fields[fieldName].hasOwnProperty('filters'))
			handleFieldSanitization.call(this, fieldName);

		// if some validators are defined for this field
		if (this.fields[fieldName].hasOwnProperty('validators'))
			handleFieldValidation.call(this, fieldName);
	};

  // flash errors if option enabled
  if ( !! this.options.flash.errors)
    flash.call(this, req.session, this.errors, this.options.flash.errors);

  // flash inputs if option enabled
	if ( !! this.options.flash.inputs)
    flash.call(this, req.session, this.requestValues.body, this.options.flash.inputs);

	return this;
}


/**
 *
 * @return {!boolean}
 * @api public
 */
FormClass.prototype.isValid = function () {
	return ! Object.keys(this.errors).length;
}


/** // @todo
 *
 * @return {FormClass}
 * @api public
 */
FormClass.prototype.hydrate = function (data) {
  if (data === Object(data)) {
    for (key in data) {
      if (this.validationGroup.hasOwnProperty(key)) {
        //
      }
    }
  }
  return this;
}



/**
 *
 *
 *
 *
 * @api public
 */
FormClass.prototype.bindEntity = function (entity) {
	this.entity = entity;
	return this;
}



// FormClass.prototype.widget = function () {
//   var formComponents = this.mixins.form.join();
//   if ( ~ formComponents.indexOf('{{formOpen}}')) {
//     formComponents.replace('{{formOpen}}', this.__proto__.open());
//   }
// }


// FormClass.prototype.open = function () {
//   var str        = this.mixins.formOpen
//     , action     = this.options.action || false
//     , method     = this.options.method
//     , multipart  = doesFormNeedEnctypeAttr.call(this)
//     , attributes;
// }


/******************************************************************************/
/*                         |   @Private   |                                   */
/*                         v              v                                   */



/**
 * Create and return an object with keys/values of the request parameters for
 * all fields registered in the 'validationGroup' property of the form instance.
 * - If a key is undefined in req, a key is created in the copy with a null value
 * - If the form method is GET, we save the req.params values as if they were
 *   from req.body so we don't have to check this anymore.
 *
 * @this   {FormClass}
 * @param  {Object}    req
 * @return {!Object}
 * @api private
 */
function copyRequestValuesOfValidationGroup(req) {
	var o = { body: {}, files: {} };

  // @todo check the GET method, I'm not sure of the req.param() getter.
	if (this.options.method.toUpperCase() === 'GET') { // GET
		this.validationGroup.forEach(function (field) {
			o.body[field] = req.param(field);
		});
	}
	else { // POST || PUT || DELETE
		if ( ! req.body && !! this.validationGroup.length) { // bodyParser not enabled ?
			if (this.options.debug) {
				throw new Error('FormFactory error => The connect bodyParser middleware'
												 + ' needs to be enabled in your app in order to deal with'
												 + ' POST/PUT parameters');
			}
			else return o;
		}

		this.validationGroup.forEach(function (field) {
			if (this.fields[field].type === 'file') { // Input[file]
				if ( !! req.files) {
					// @todo check against field.name but i don't know for the time being
					o.files[field] = req.files.hasOwnProperty(field)
													? req.files[field]
													: null;
				}
        // key 'files' not found in req and debug ?
				else if (this.options.debug) {
					throw new Error('FormFactory error => "req.files" does not seem to'
													 + ' exist for the "' + field + '" file.'
													 + ' Did you add the enctype="multipart/form-data"'
													 + ' option in your form ?');
				}
				else o.files[field] = null; // key 'files' not found in req ?
			}
			else { // Input[text, password, number......], textarea, ...
				o.body[field] = req.body.hasOwnProperty(field)
												? req.body[field]
												: null;
			}
		}, this);
	}
	return o;
}


/**
 * Sanitize one request value by all registered filters for his field.
 *
 * @this  {FormClass}
 * @param {string}    fieldName
 * @api private
 */
function handleFieldSanitization (fieldName) {
	// Array of filters
	var fieldFilters = this.fields[fieldName].filters.split('|')
		, str          = this.requestValues.body[fieldName];

	// enter the loop even if null str value (cf filters in Validator module)
	for (var key in fieldFilters) {
		var filterName = fieldFilters[key]
			, filterArgs = [];

		// if this filter needs some parameters, extract them
		if ( ~ filterName.indexOf(':')) {
			filterArgs = filterName.split(':');
			filterName = filterArgs.shift();
		}

		str = filter.sanitize(str)[filterName].apply(filter, filterArgs);
	}
	this.requestValues.body[fieldName] = str;
}


/**
 * Check if a request value is valid according to the validators registered
 * for his field.
 * If not, record an error in the 'errors' object of the form instance.
 *
 * @this  {FormClass}
 * @param {string}    fieldName
 * @api private
 */
function handleFieldValidation(fieldName) {
	// Array of validators
	 var fieldValidators = this.fields[fieldName].validators.split('|');

	for (var key in fieldValidators) {
		var validator = fieldValidators[key]
			, validatorArgs = [];

		// if this validator needs some parameters, extract them
		if ( ~ validator.indexOf(':')) {
			validatorArgs = validator.split(':');
			validator     = validatorArgs.shift();
		}

		// if this validator exists in the Validator Module
		if (validatorsLib.hasOwnProperty(validator)) {
			// add the value from the request
			validatorArgs.unshift(this.requestValues.body[fieldName] || '');

			// if the given value is invalid
			if ( ! validatorsLib[validator].apply(null, validatorArgs)) {
				// add an error message for this field
				var msg = getErrorMessage.call(this, fieldName, validator, validatorArgs);
				if ( ! this.errors.hasOwnProperty(fieldName)) this.errors[fieldName] = [msg];
				else this.errors[fieldName].push(msg);
			}
		}
		else if (this.options.debug) {
			throw new Error('FormFactory error => The validator "' + validator +
											'" does not not exist for the field "' + fieldName + '"');
		}
	}
}


/**
 * Build an error message for the given field from field's parameters or from
 * the default dictionnary.
 *
 * Replace placeholders :
 *    %0      ==> Value entered by the user
 *    %1      ==> First parameter of the validator
 *    %n      ==> nth parameter of the validator
 *    %field  ==> The field name (or lowercased label if provided and option enabled (default))
 *
 * @this    {FormClass}
 * @param   {string}    fieldName
 * @param   {string}    validator
 * @param   {Array}     validatorArgs
 * @return  {!string}
 * @api private
 */
 // @todo compile name when FormClassOfType is created
function getErrorMessage (fieldName, validator, validatorArgs) {
	var msg = getCustomErrorMessage.call(this, fieldName, validator)
    , name;

	! msg && (msg = errorDictionnary[validator] || 'Invalid value');
  if (this.fields[fieldName].hasOwnProperty('label')
      && this.options.messages.preferLabelOverName ) {
    name = this.fields[fieldName].label.toLowerCase();
  }
  else name = fieldName;

  if (this.options.messages.stripFieldNameUnderscores)
    name = name.replace('_', '');

  // replace placeholders by their corresponding value:
	msg = msg.replace('%field', name);
	validatorArgs.forEach(function(arg, i) { msg = msg.replace('%'+i, arg); });
	return msg;
}


/**
 * Return the custom message registered by the user for a field and a validator.
 *
 * @this   {FormClass}
 * @param  {string}      fieldName
 * @param  {string}      validator
 * @return {?string}
 * @api private
 */
function getCustomErrorMessage(fieldName, validator) {
	return this.fields[fieldName].hasOwnProperty('messages')
					? this.fields[fieldName].messages.hasOwnProperty('validator')
						? this.fields[fieldName].messages[validator]
					:null:null;
}


/**
 * Flash some data in session to the given 'sessionKey'.
 *
 *  The 'sessionKey' provided as a string can represent a setter method:
 *     e.g.    flashBag.add('label', %err)
 *              something.else.stuff.put('label', %err)
 *   where 'label' is optional.
 *
 *  Or a chain of object's keys:
 *     e.g.  'something.else.formInputs'
 *  !!!!  Only the last key will be created  !!!
 *
 * @this  {FormClass}
 * @param {Object}     session
 * @param {Object}     data     ({Object} in this module but could be anything)
 * @param {string}     sessionKey
 * @api private
 */
function flash(session, data, sessionKey) {
	if ( !! session) {
		var property
      , matches = /(.*)\.{1}(\w+)\((('.*'|".*"),)?\s*(%err)\)/.exec(sessionKey);

		if ( !! matches) {
      /*******************************************************/
      /********  Record data by a setter method:  ***********/
      var property    = matches[1]
        , setter      = matches[2]
        , label       = matches[4];

      if (property.match(/(\w\.)+\w/))
        property = getObjAccessorFromDottedString(session, property);
      else property = session[property];

      if ( ! property) {
        if (this.options.debug)
          throw new Error('FormFactory error => Cannot access "'
                           + matches[1] + '" of req.session');
        else return;
      }

      // 'label' is optional
      var setterArgs = !! label
                       ? [label, data]
                       : [data];

      try { property[setter].apply(property, setterArgs) }
      catch (err) { // hmm, just to be sure
        if (this.options.debug) throw new Error(err);
      }

      return;
      /*******************************************************/
    }
    else {
      /************    Record data by a key:    *************/
      if (sessionKey.match(/(\w\.)+\w/)) {
        property = getObjAccessorFromDottedString(session, sessionKey.replace(/(\w\.)+\w)/, $1));
        if ( ! property) {
          if (this.options.debug)
            throw new Error('FormFactory error => Cannot access "'
                             + sessionKey + '" of req.session');
          else return;
        }
      }
      else property = session;

      property[sessionKey] = data;
      /*******************************************************/
      /*******************************************************/
    }
	}
	else if (this.options.debug) {
		throw new Error ('FormFactory error => Session must be enabled to flash data');
	}
}


/**
 * Return the property of the given 'obj' targeted by the chain 'str' wich
 * represents a chain of keys, e.g. 'something.else.stuff'.
 *
 * Since I don't need it here, this function DOES NOT strip any dot at the
 * end of the 'str' string and so, returns null if there is one.
 *
 * @param  {Object}  obj
 * @param  {string}  str  ( "n.[ ... ].m" )
 * @return {*}       obj[n][ ... ][m]
 * @api private
 */
function getObjAccessorFromDottedString(obj, str) {
	var chainedProperties = str.split('.')
		, chain             = obj
		, chainFragment;

	while (chain && chainedProperties.length) {
		chainFragment = chainedProperties.shift();
		if (chain.hasOwnProperty(chainFragment)) {
			chain = chain[chainFragment];
		}
		else chain = false;
	}
	return chain || null;
}