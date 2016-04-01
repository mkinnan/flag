/**
 * Implements hook_services_success().
 */
function flag_services_postprocess(options, data) {
  try {
    // Extract the flag settings from the system connect result data.
    if (options.service == 'system' && options.resource == 'connect') {
      if (data.flag) {
        drupalgap.flag = data.flag;
      }
      else {
        console.log('flag_services_postprocess - failed to extract flag settings from system connect.');
      }
    }
  }
  catch (error) { console.log('flag_services_postprocess - ' + error); }
}

/**
 * Implements hook_entity_post_render_content().
 */
function flag_entity_post_render_content(entity, entity_type, bundle) {
  try {
    if (!Drupal.user.uid) { return; } // Anonymous users cannot flag anything.

    // Since flag isn't a field, we'll just prepend it to the entity content.
      var flags = flag_get_entity_flags(entity_type, bundle);
      if (!flags) { return; }
      var entity_id = entity[entity_primary_key(entity_type)];
      var html = '';
      var page_id = drupalgap_get_page_id();
      $.each(flags, function(fid, flag) {
          var container_id = flag_container_id(flag.name, entity_id);
          html += '<div id="' + container_id + '"></div>' +
            drupalgap_jqm_page_event_script_code(
              {
                page_id: page_id,
                jqm_page_event: 'pageshow',
                jqm_page_event_callback: '_flag_pageshow',
                jqm_page_event_args: JSON.stringify({
                    fid: fid,
                    entity_id: entity_id,
                    entity_type: entity_type,
                    bundle: bundle
                })
              },
              flag.fid
            );
      });
      entity.content = html + entity.content;
  }
  catch (error) {
    console.log('flag_entity_post_render_content - ' + error);
  }
}

/**
 *
 */
function _flag_pageshow(options) {
  try {
    var flag = flag_load(options.fid);
    flag_is_flagged(flag.name, options.entity_id, Drupal.user.uid, {
        success: function(result) {
          try {
            var html = '';
            var flagged = result[0];
            var text = null;
            var action = null;
            if (flagged) {
              text = flag.options.unflag_short;
              action = 'unflag';
            }
            else {
              text = flag.options.flag_short;
              action = 'flag';
            }
            html += theme('flag', {
                fid: flag.fid,
                entity_id: options.entity_id,
                action: action,
                text: text,
                entity_type: options.entity_type,
                bundle: options.bundle
            });
            var container_id = flag_container_id(flag.name, options.entity_id);
            $('#' + container_id).html(html).trigger('create');
          }
          catch (error) { console.log('_flag_pageshow - success - ' + error); }
        }
    });
  }
  catch (error) { console.log('_flag_pageshow - ' + error); }
}

/**
 *
 */
function _flag_onclick(fid, entity_type, bundle, entity_id, action) {
  try {
    var flag = flag_load(fid);
    if (!flag) { return; }
    flag_flag(flag.name, entity_id, action, Drupal.user.uid, false, {
        entity_type: entity_type,
        bundle: bundle,
        success: function(result) {
          try {
            if (result[0]) {
              // Redraw the flag to be opposite of what just happened, and show
              // an alert of what just happened.
              var msg = null;
              var text = null;
              if (action == 'flag') {
                action = 'unflag';
                text = flag.options.unflag_short;
                if (typeof flag.options.flag_message !== 'undefined' && flag.options.flag_message != '') {
                  msg = flag.options.flag_message;  
                }
              }
              else {
                action = 'flag';
                text = flag.options.flag_short;
                if (typeof flag.options.unflag_message !== 'undefined' && flag.options.unflag_message != '') {
                  msg = flag.options.unflag_message;  
                }
              }
              if (msg) { drupalgap_alert(msg); }
              var html = theme('flag', {
                  fid: fid,
                  entity_id: entity_id,
                  action: action,
                  text: text,
                  entity_type: entity_type,
                  bundle: bundle
              });
              var container_id = flag_container_id(flag.name, entity_id);
              $('#' + container_id).html(html).trigger('create');
            }
          }
          catch (error) { console.log('_flag_onclick - success - ' + error); }
        }
    });
  }
  catch (error) { console.log('_flag_onclick - ' + error); }
}

/**
 *  
 */
function flag_get_entity_flags(entity_type, bundle) {
  try {
    var flags = null;
    $.each(drupalgap.flag, function(fid, flag) {
        if (flag.entity_type == entity_type) {
          if (!bundle) {
            if (!flags) { flags = {}; }
            flags[fid] = flag;
            return;
          }
          $.each(flag.types, function(index, _bundle) {
              if (bundle == _bundle) {
                if (!flags) { flags = {}; }
                flags[fid] = flag;
                return false;
              }
          });
        }
    });
    return flags;
  }
  catch (error) { console.log('flag_get_entity_flags - ' + error); }
}

/**
 *
 */
function flag_container_id(flag_name, entity_id) {
  try {
    return 'flag_' + flag_name + '_' + entity_id;
  }
  catch (error) { console.log('flag_container_id - ' + error); }
}

/**
 *
 */
function flag_load(fid) {
  try {
    var flag = null;
    $.each(drupalgap.flag, function(_fid, _flag) {
        if (fid == _fid) {
          flag = _flag;
          return false;
        }
    });
    return flag;
  }
  catch (error) { console.log('flag_load - ' + error); }
}

/**
 * HELPERS
 */

/**
 * Returns html for a quick link that can be used for a "split" link in a jQuery Mobile list view item.
 * @param {String} flag_name
 * @param {String} entity_type
 * @param {Number} entity_id
 * @param {Number} flagged The current flag status.
 * @returns {String}
 */
function flag_quick_link(flag_name, entity_type, entity_id, flagged) {
  return l('Do it', null, {
    attributes: {
      onclick: _flag_quick_link_onclick_attribute(flag_name, entity_type, entity_id, flagged),
      'data-theme': _flag_quick_link_data_theme(flagged)
    }
  });
}

/**
 * Handles clicks on jQM list view "split" quick links to toggle the flag for a given entity.
 * @param {Object} button
 * @param {String} flag_name
 * @param {String} entity_type
 * @param {Number} entity_id
 * @param {Number} flagged
 */
function _flag_quick_link_onclick(button, flag_name, entity_type, entity_id, flagged) {
  var action = flagged ? 'unflag' : 'flag';
  flag_flag(flag_name, entity_id, action, Drupal.user.uid, true, {
    success: function(results) {
      if (!results[0]) { console.log(t('Flagging was unsuccessful!')); return; }
      var new_theme = _flag_quick_link_data_theme(!flagged);
      var old_theme = _flag_quick_link_data_theme(flagged);
      var new_onclick = _flag_quick_link_onclick_attribute(flag_name, entity_type, entity_id, !flagged);
      var new_class = 'ui-btn-' + new_theme;
      var old_class = 'ui-btn-' + old_theme;
      $(button).attr('data-theme', new_theme).attr('onclick', new_onclick).removeClass(old_class).addClass(new_class).trigger('create');
      // In case the entity page view was already in the DOM, try to remove it.
      setTimeout(function() {
        drupalgap_remove_page_from_dom(drupalgap_get_page_id(entity_type + '/' + entity_id));
      }, 50);
    }
  });
}

/**
 * Returns the onclick attribute value for a flag quick link.
 * @param {String} flag_name
 * @param {String} entity_type
 * @param {Number} entity_id
 * @param {Boolean} flagged
 * @returns {string}
 */
function _flag_quick_link_onclick_attribute(flag_name, entity_type, entity_id, flagged) {
  return "_flag_quick_link_onclick(this, '" + flag_name + "', '" + entity_type + "', " + entity_id + ", " + flagged + ")";
}

/**
 * Returns the data theme to use on a quick link button for the given flagged status.
 * @param {Boolean} flagged
 * @returns {string}
 */
function _flag_quick_link_data_theme(flagged) {
  var data_theme_flagged = 'b';
  var data_theme_unflagged = 'a';
  if (drupalgap.settings.flag) {
    if (drupalgap.settings.flag.data_theme_flagged) { data_theme_flagged = drupalgap.settings.flag.data_theme_flagged; }
    if (drupalgap.settings.flag.data_theme_unflagged) { data_theme_unflagged = drupalgap.settings.flag.data_theme_unflagged; }
  }
  return flagged ? data_theme_flagged : data_theme_unflagged;
}

/********|
 * Theme |
 ********/

/**
 * Theme's a flag.
 */
function theme_flag(variables) {
  try {
    var css_class = variables.action == 'flag' ? 'unflagged' : 'flagged';
    var attributes = {
      onclick: "_flag_onclick(" + variables.fid + ", '" + variables.entity_type + "', '" + variables.bundle + "', " +
        variables.entity_id + ", '" + variables.action + "')",
      'class': css_class,
      'data-theme': _flag_quick_link_data_theme(css_class == 'flagged')
    };
    return theme('button_link', {
        path: null,
        text: variables.text,
        attributes: attributes
    });
  }
  catch (error) { console.log('theme_flag - ' + error); }
}


/***********|
 * Services |
 ***********/

/**
 * Check if a entity was flagged by a user.
 * @param {String} flag_name
 * @param {Number} entity_id
 * @param {Number} uid (optional)
 * @param {Object} options
 */
function flag_is_flagged(flag_name, entity_id, uid, options) {
  try {
    options.method = 'POST';
    options.path = 'flag/is_flagged.json';
    options.service = 'flag';
    options.resource = 'is_flagged';
    var data = {
      flag_name: flag_name,
      entity_id: entity_id
    };
    if (uid) { data.uid = uid; }
    options.data = JSON.stringify(data);
    Drupal.services.call(options);
  }
  catch (error) { console.log('flag_is_flagged - ' + error); }
}

/**
 * Flags (or unflags) an entity.
 * @param {String} flag_name
 * @param {Number} entity_id
 * @param {String} action
 * @param {Number} uid (optional)
 * @param {Boolean} skip_permission_check (optional)
 * @param {Object} options
 */
function flag_flag(flag_name, entity_id, action, uid, skip_permission_check, options) {
  try {
    options.method = 'POST';
    options.path = 'flag/flag.json';
    options.service = 'flag';
    options.resource = 'flag';
    if (typeof action === 'undefined') { action = 'flag'; }
    if (typeof skip_permission_check === 'undefined') { skip_permission_check = false; }
    var data = {
      flag_name: flag_name,
      entity_id: entity_id,
      action: action,
      skip_permission_check: skip_permission_check
    };
    if (uid) { data.uid = uid; }
    options.data = JSON.stringify(data);
    Drupal.services.call(options);
  }
  catch (error) { console.log('flag_flag - ' + error); }
}

/**
 * Count the flags number on a specific node.
 * @param {String} flag_name
 * @param {Number} entity_id
 * @param {Object} options
 */
function flag_countall(flag_name, entity_id, options) {
  try {
    options.method = 'POST';
    options.path = 'flag/countall.json';
    options.service = 'flag';
    options.resource = 'countall';
    var data = {
      flag_name: flag_name,
      entity_id: entity_id
    };
    options.data = JSON.stringify(data);
    Drupal.services.call(options);
  }
  catch (error) { console.log('flag_countall - ' + error); }
}
