  var FormFactory = require('../../lib/form-factory');


  var UserForm = FormFactory.create(
    {
      /*****************************************/
      username : {
        type: 'text',
        validators: 'notNull|isAlphanumeric|len:1:30',
        filters: 'trim',
        messages: {
          len: 'The username may not be greater than %1 characters'
        }
      },
      /*****************************************/
      password : {
        type: 'password',
        validators: 'notNull'
      },
      /*****************************************/
      password_confirmation : {
        type: 'password',
        label: 'Confirm Password',
        validators: 'notNull|equals:password'
      },
      /*******************************************/
      bio : {
        type: 'textarea',
        // label
        validators: 'notEmpty|len:0:160',
        messages: {
          len: 'The bio may not be greater than %2 characters'
        }
      },
      /*****************************************/
      avatar : {
        type: 'file',
        //linktofield,
      },
    },
    {
      method: 'POST',
      debug: true,
      flash: {
        // flash: 'flashBag.add('label', %err)'
        // flash: 'flashBag.add(%err)'
        errors: 'FormErrors',
        inputs: 'FormInputs'
      }
    }

  );


  exports = module.exports = UserForm;
