var App, Event, EventLinks, Link, LinkList, LinkView;

App = new Marionette.Application({
  regions: {
    content: '#eventbrite-event-details'
  }
});

Event = Backbone.Model.extend({});

Link = Backbone.Model.extend({});

LinkList = Backbone.Collection.extend({
  model: Link
});

LinkView = Marionette.ItemView.extend({
  className: 'event-button',
  template: _.template('<a href="<%= url %>"><i class="<%= icon %>"></i> <%= text %></a>')
});

EventLinks = Marionette.CollectionView.extend({
  className: 'event-buttons',
  childView: LinkView
});

App.addInitializer(function(options) {
  var ev;
  ev = new Event(options);
  if (_.isEmpty(options.ID)) {
    window.location.reload();
  }
  jQuery('.subheader').html(moment(ev.get('start').local).format('MMMM Do, YYYY')).prev().html(ev.get('venue').address.city + ", " + ev.get('venue').address.region);
  if (ev.get('public')) {
    App.content.show(new EventLinks({
      collection: new LinkList([
        {
          url: ev.get('url') + '?team_reg_type=individual',
          icon: 'icomoon-user',
          text: 'Participate as an individual'
        }, {
          url: ev.get('url') + '#team-search',
          icon: 'icomoon-users',
          text: 'Join a team'
        }, {
          url: ev.get('url') + '#team-create',
          icon: 'icomoon-plus',
          text: 'Create a team'
        }, {
          url: 'https://www.eventbrite.com/mytickets/',
          icon: 'icomoon-cog',
          text: 'Manage your team'
        }
      ])
    }));
    return jQuery('.main-content form').parent().hide();
  }
});
