/* NODE FORM-FACTORY MODULE */


var FormClass = require('./form-class');


var FormFactory = {
  /**
   *
   * @param {Object} fields
   * @param {Object|null} options
   *
   * @api public
   */
  create: function (fields, options) {
    var FormClassOfType = function () {
      this.entity        = {};
      this.errors        = {};
      this.requestValues = {};
      this.session       = null;
    }
    FormClassOfType.prototype = new FormClass();
    FormClassOfType.prototype.fields = fields;
    FormClassOfType.prototype.options = compileOptions(options);
    // Shortcut
    FormClassOfType.prototype.mixins = FormClassOfType.prototype.options.mixins;

    return FormClassOfType;
  }
};





function compileOptions(options) {
  var defaultOptions = {
    method: 'POST',
    debug: false,
    attributes: { // for the opening tag of the form

    },
    filters: {

    },
    validators: {

    },
    messages: {
      preferLabelOverName: true,
      stripFieldNameUnderscores: true
    },
    flash: {
      errors: false,
      inputs: false
    },
    mixins: {
      // please don't put spaces inside brackets
      form: [
        '{{formOpen}}',
          '{{fields}}',
          '{{submitBtn}}',
        '{{formClose}}'
      ],
      formOpen: '<form {{action}} {{method}} {{multipart}} {{attributes}}>',
      formClose: '</form>',
      field: [
        '<div {{errorClass}}>',
          '<label for="{{fieldName}}">{{label}}</label>',
          '{{field}}',
        '</div>'
      ],
      input: '<input type={{type}} {{attributes}} {{oldValue}}/>',
      textarea: '<textarea {{attributes}}>{{oldValue}}</textarea>',
    }
  };

  if ( ! options) return defaultOptions;

  function override(defaultOptions, userOptions) {
    for (var key in userOptions) {
      if (userOptions[key] === Object(userOptions[key])) {
        if (defaultOptions[key] === Object(defaultOptions[key])) {
          defaultOptions[key] = override(defaultOptions[key], userOptions[key])
        }
      }
      else if (typeof defaultOptions[key] !== 'undefined') {
        defaultOptions[key] = userOptions[key];
      }
    }
    return defaultOptions;
  }

  return override(defaultOptions, options);
}


/*---------------------------------------------------*/

exports = module.exports = FormFactory;
/*

 Check :
 - filters and validators must be strings !!
 - flash.errors and flash.inputs must be anot empty string or false
 - transform mixins array into strings so i don't perform join for each
    instance every time the form is builded
 - add an enctype multipart attr if field of type 'file' defined
*/