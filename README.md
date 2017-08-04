# flag

The Flag module for DrupalGap.

## Setup

Download and enable the Flag Service module on your Drupal site:

- https://drupal.org/project/flag_service

Enable the DrupalGap Flag module on your Drupal site. This is a sub module included with the DrupalGap module:
   
- https://drupal.org/project/drupalgap

On your drupal site, navigate to `admin/structure/services/list/drupalgap/resources`  then enable the 3 resources under the 'flag' service.

Add this module to your `settings.js` file in DrupalGap:

```
Drupal.modules.contrib['flag'] = {};
```

## settings.js

```
drupalgap.settings.flag = {

  // Configure the data theme to use when an entity is flagged or unflagged.
  data_theme_flagged: 'a',
  data_theme_unflagged: 'b'
}
```

### Examples

The flag module for DrupalGap will automatically prepend a flag button to an entity's content when the entity is being viewed.

### Render Flags on Custom Entity Rendering

If you override the default node display following the tutorial found here (http://docs.drupalgap.org/7/Entities/Rendering_Entities), then you can easily display flags on your custom rendering using the following code example:

```
function my_module_team_page(node) {
  var content = {};
  
  var entity_type = 'node';
  var bundle = node.type;
  var entity_id = node.nid

  var flags = flag_get_entity_flags(entity_type, bundle);

  var page_id = drupalgap_get_page_id();
  $.each(flags, function(fid, flag) {

    // Build the render array.
    content['flag_' + fid]= { markup: '<div id="' + flag_container_id(flag.name, entity_id) + '" class="flag"></div>' +
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
        entity_type + '-' + entity_id + '-' + flag.fid
      ) };
      
  });    
  
  return content;
}


```

#### Views Render Array Row Quick Links for Flags

If you'd like to provide flags next to some list items from a Views Render, set up your Views JSON to return something like this:

```
{
  "nodes" : [
    {
      "node" : {
        "title" : "Foo",
        "nid" : "123",
        "flagged" : "0"
      }
    },
    {
      "node" : {
        "title" : "Bar",
        "nid" : "456",
        "flagged" : "1"
      }
    }
  ]
}
```

Then build your `page_callback` for your page that will display the render array to return something like this:

```
var content = {};
content['my_articles_list'] = {
  theme: 'view',
  format: 'ul',
  format_attributes: {
    'data-split-icon': 'star' /* the icon to use for the flag button */
  },
  path: 'articles', /* the path to the view in Drupal */
  row_callback: 'my_module_articles_list_row',
  empty_callback: 'my_module_articles_list_empty',
  attributes: {
    id: 'my_articles_list_view'
  }
};
return content;
```

Then build your `row_callback` for your render array to return something like this:

```
return l(row.title, 'node/' + row.nid) +
  flag_quick_link(
    'favorite', // The flag's machine name.
    'node', // The entity type.
    row.nid, // The entity id.
    parseInt(row.flagged) ? true : false // The current flag status.
  );
```

#### Display Flag Count on a Node Page

- http://pastebin.com/1r602H6A
