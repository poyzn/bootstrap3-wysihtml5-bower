(function (factory) {
  'use strict';
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define('bootstrap.wysihtml5', ['jquery', 'wysihtml5', 'bootstrap', 'bootstrap.wysihtml5.templates', 'bootstrap.wysihtml5.commands'], factory);
  } else {
    // Browser globals
    factory(jQuery, wysihtml5); // jshint ignore:line
  }
}(function ($, wysihtml5) {
  'use strict';
  var bsWysihtml5 = function($, wysihtml5) {

    var templates = function(key, locale, options) {
      if(wysihtml5.tpl[key]) {
        return wysihtml5.tpl[key]({locale: locale, options: options});
      }
    };

    var Wysihtml5 = function(el, options) {
      this.el = el;
      var toolbarOpts = $.extend(true, {}, defaultOptions, options);
      for(var t in toolbarOpts.customTemplates) {
        if (toolbarOpts.customTemplates.hasOwnProperty(t)) {
          wysihtml5.tpl[t] = toolbarOpts.customTemplates[t];
        }
      }
      this.toolbar = this.createToolbar(el, toolbarOpts);
      this.editor =  this.createEditor(toolbarOpts);
    };

    Wysihtml5.prototype = {

      constructor: Wysihtml5,

      createEditor: function(options) {
        options = options || {};

        // Add the toolbar to a clone of the options object so multiple instances
        // of the WYISYWG don't break because 'toolbar' is already defined
        options = $.extend(true, {}, options);
        options.toolbar = this.toolbar[0];
        
        if($.type(options.parserRules) === 'string') {
          // parserRules is a url, load the json from address
          $.getJSON(options.parserRules, function(parserRules) {
            options.parserRules = parserRules;
          });
        }

        var editor = new wysihtml5.Editor(this.el[0], options);

        // #30 - body is in IE 10 not created by default, which leads to nullpointer
        // 2014/02/13 - adapted to wysihtml5-0.4, does not work in IE
        if(editor.composer.editableArea.contentDocument) {
          this.addMoreShortcuts(editor, 
                                editor.composer.editableArea.contentDocument.body || editor.composer.editableArea.contentDocument, 
                                options.shortcuts);
        } else {
          this.addMoreShortcuts(editor, editor.composer.editableArea, options.shortcuts);    
        }


        if(options && options.events) {
          for(var eventName in options.events) {
            if (options.events.hasOwnProperty(eventName)) {
              editor.on(eventName, options.events[eventName]);
            }
          }
        }

        editor.on('beforeload', this.syncBootstrapDialogEvents);
        return editor;
      },

      //sync wysihtml5 events for dialogs with bootstrap events
      syncBootstrapDialogEvents: function() {
        var editor = this;
        $.map(this.toolbar.commandMapping, function(value) {
          return [value];
        }).filter(function(commandObj) {
          return commandObj.dialog;
        }).map(function(commandObj) {
          return commandObj.dialog;
        }).forEach(function(dialog) {
          dialog.on('show', function() {
            $(this.container).modal('show');
          });
          dialog.on('hide', function() {
            $(this.container).modal('hide');
            editor.composer.focus();
          });
          $(dialog.container).on('shown.bs.modal', function () {
            $(this).find('input, select, textarea').first().focus();
          });
        });
        this.on('change_view', function() {
          $(this.toolbar.container.children).find('a.btn').not('[data-wysihtml5-action="change_view"]').toggleClass('disabled');
        });
      },

      createToolbar: function(el, options) {
        var self = this;
        var toolbar = $('<ul/>', {
          'class' : 'wysihtml5-toolbar',
          'style': 'display:none'
        });
        var culture = options.locale || defaultOptions.locale || 'en';
        if(!locale.hasOwnProperty(culture)) {
          console.debug('Locale \'' + culture + '\' not found. Available locales are: ' + Object.keys(locale) + '. Falling back to \'en\'.');
          culture = 'en';
        }
        var localeObject = $.extend(true, {}, locale.en, locale[culture]);
        for(var key in options.toolbar) {
          if(options.toolbar[key]) {
            toolbar.append(templates(key, localeObject, options));
          }
        }

        toolbar.find('a[data-wysihtml5-command="formatBlock"]').click(function(e) {
          var target = e.delegateTarget || e.target || e.srcElement,
          el = $(target),
          showformat = el.data('wysihtml5-display-format-name'),
          formatname = el.data('wysihtml5-format-name') || el.html();
          if(showformat === undefined || showformat === 'true') {
            self.toolbar.find('.current-font').text(formatname);
          }
        });

        toolbar.find('a[data-wysihtml5-command="foreColor"]').click(function(e) {
          var target = e.target || e.srcElement;
          var el = $(target);
          self.toolbar.find('.current-color').text(el.html());
        });

        this.el.before(toolbar);

        return toolbar;
      },

      addMoreShortcuts: function(editor, el, shortcuts) {
        /* some additional shortcuts */
        wysihtml5.dom.observe(el, 'keydown', function(event) {
          var keyCode  = event.keyCode,
          command  = shortcuts[keyCode];
          if ((event.ctrlKey || event.metaKey || event.altKey) && command && wysihtml5.commands[command]) {
            var commandObj = editor.toolbar.commandMapping[command + ':null'];
            if (commandObj && commandObj.dialog && !commandObj.state) {
              commandObj.dialog.show();
            } else {
              wysihtml5.commands[command].exec(editor.composer, command);
            }
            event.preventDefault();
          }
        });
      }
    };

    // these define our public api
    var methods = {
      resetDefaults: function() {
        $.fn.wysihtml5.defaultOptions = $.extend(true, {}, $.fn.wysihtml5.defaultOptionsCache);
      },
      bypassDefaults: function(options) {
        return this.each(function () {
          var $this = $(this);
          $this.data('wysihtml5', new Wysihtml5($this, options));
        });
      },
      shallowExtend: function (options) {
        var settings = $.extend({}, $.fn.wysihtml5.defaultOptions, options || {}, $(this).data());
        var that = this;
        return methods.bypassDefaults.apply(that, [settings]);
      },
      deepExtend: function(options) {
        var settings = $.extend(true, {}, $.fn.wysihtml5.defaultOptions, options || {});
        var that = this;
        return methods.bypassDefaults.apply(that, [settings]);
      },
      init: function(options) {
        var that = this;
        return methods.shallowExtend.apply(that, [options]);
      }
    };

    $.fn.wysihtml5 = function ( method ) {
      if ( methods[method] ) {
        return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
      } else if ( typeof method === 'object' || ! method ) {
        return methods.init.apply( this, arguments );
      } else {
        $.error( 'Method ' +  method + ' does not exist on jQuery.wysihtml5' );
      }    
    };

    $.fn.wysihtml5.Constructor = Wysihtml5;

    var defaultOptions = $.fn.wysihtml5.defaultOptions = {
      toolbar: {
        'font-styles': true,
        'color': false,
        'emphasis': {
          'small': true
        },
        'blockquote': true,
        'lists': true,
        'html': false,
        'link': true,
        'image': true,
        'smallmodals': false
      },
      parserRules: 'src/default_parser_rules_pretty.js',
      locale: 'en',
      shortcuts: {
        '83': 'small'     // S
      }
    };

    if (typeof $.fn.wysihtml5.defaultOptionsCache === 'undefined') {
      $.fn.wysihtml5.defaultOptionsCache = $.extend(true, {}, $.fn.wysihtml5.defaultOptions);
    }

    var locale = $.fn.wysihtml5.locale = {};
  };
  bsWysihtml5($, wysihtml5);
}));
