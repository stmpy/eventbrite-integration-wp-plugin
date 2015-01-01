App = new Marionette.Application

Event = Backbone.Model.extend
	initialize: (attributes) ->
		start = attributes.start
		mStart = moment(start.local)
		mEnd = moment(attributes.end.local)
		start.formatted = mStart.format('dddd, MMMM Do, YYYY') + ' from ' + mStart.format('h:mm a') + ' to ' + mEnd.format('h:mm a zz')
		@set 'start', start

EventView = Marionette.ItemView.extend
	initialize: (options) ->
		@template = options.template if options.template

### LINKING ###
Link = Backbone.Model.extend
	initialize: (attributes) ->
		@set 'icon', '<i class="' + attributes.icon_name + '"></i>'

LinkList = Backbone.Collection.extend model: Link

EventLinks = Marionette.CollectionView.extend
	className: 'event-buttons'
	childView: EventView
	initialize: (options) ->
		@template = options.template if options.template

	childViewOptions: ->
		template: @template

NoEvent = Marionette.ItemView.extend
	template: Handlebars.compile '<h3>Unable to Find event please refresh the page or try again.</h3>'

### TICKETING ###
Ticket = Backbone.Model.extend
	initialize: (attributes) ->
		if attributes.free
			@set 'price', 'Free'
		else
			@set 'price', attributes.cost.display

		sale_ends = moment(attributes.sales_end)
		two_weeks = moment().add 2, 'weeks'

		if sale_ends.isBefore two_weeks
			@set 'timeleft', 'only ' + sale_ends.diff(moment(), 'days') + ' days left at this price'
		else
			@set 'timeleft', 'until ' + sale_ends.format 'MMMM Do YYYY'

Tickets = Backbone.Collection.extend model: Ticket

TicketsView = Marionette.CollectionView.extend
	childView: EventView
	initialize: (options) ->
		@template = options.template if options.template

	childViewOptions: ->
		template: @template

App.hideRegForm = ->
	jQuery('.eventbrite-event-private').each (i, e) ->
		jQuery(e).hide()

App.hidePublicDetails = ->
	jQuery('.eventbrite-event-public').each (i,e) ->
		jQuery(e).hide()

App.displayLinks = (ev) ->
	@event_links.$el.each (i, e) ->
		jQuery(e).html (new EventLinks
			collection: new LinkList [
				url: ev.get('url') + '?team_reg_type=individual'
				icon_name: 'icomoon-user'
				text: 'Participate as an individual'
			,
				url: ev.get('url') + '#team-search'
				icon_name: 'icomoon-users'
				text: 'Join a team'
			,
				url: ev.get('url') + '#team-create'
				icon_name: 'icomoon-plus'
				text: 'Create a team'
			,
				url: 'https://www.eventbrite.com/mytickets/'
				icon_name: 'icomoon-cog'
				text: 'Manage your team'
			]
			template: (attributes) ->
				Handlebars.compile(jQuery(e).html())(attributes) + '<br />'
		).render().el
	@hideRegForm()

### Settings ###
EventDetails = Marionette.ItemView.extend {}

App.displayTickets = (ev) ->
	@event_tickets.$el.each (i, e) ->
		jQuery(e).html (new TicketsView
			collection: new Tickets ev.get('tickets').filter (ticket) ->
				moment(ticket.sales_start).isBefore(moment().add(2, 'weeks'), 'day')
			template: (attributes) ->
				Handlebars.compile(jQuery(e).html())(attributes) + '<br />'
		).render().el

App.displayWhenWhere = (ev) ->
	@event_when_where.$el.each (i, e) ->
		jQuery(e).html (new EventView
			model: ev
			template: (attributes) ->
				Handlebars.compile(jQuery(e).html())(attributes)
		).render().el

App.displaySettings = (ev) ->
	@event_settings.$el.each (i, e) ->
		jQuery(e).html (new EventDetails
			model: ev
			template: (attributes) ->
				Handlebars.compile(jQuery(e).html())(attributes)
		).render().el

App.drawMap = (ev) ->
	location = new google.maps.LatLng(ev.get('venue').latitude, ev.get('venue').longitude)
	@map.$el.each (i, e) ->
		map = new google.maps.Map e,
			zoom: 11
			center: location
			scrollwheel: App.ops.evi_enable_scroll_wheel
			mapTypeControlOptions:
				mapTypeIds: [ google.maps.MapTypeId.ROADMAP, 'map_style']

		unless _.isEmpty(App.ops.evi_map_style)
			styledMap = new google.maps.StyledMapType JSON.parse(App.ops.evi_map_style), { name: App.ops.evi_map_style_name }
			map.mapTypes.set 'map_style', styledMap
			map.setMapTypeId 'map_style'

		settings =
			map: map
			position: location
			animation: google.maps.Animation.DROP

		settings.icon = App.ops.evi_marker_icon if App.ops.evi_marker_icon

		new google.maps.Marker settings

App.addInitializer (options) ->
	# console.log options.event
	@ops = options
	r = {}
	for region in ['event_links', 'event_tickets', 'event_when_where', 'map', 'event_settings']
		r[region] = options['evi_' + region + '_tag_id'] if jQuery(options['evi_' + region + '_tag_id']).length > 0
	@addRegions r

	ev = new Event options.event

	if _.isEmpty(options.event.ID)
		@hideRegForm()
		@event_links.show new NoEvent
		return

	# Set header for event
	jQuery('.subheader').html(moment(ev.get('start').local).format('MMMM Do, YYYY')).prev().html(ev.get('venue').address.city + ", " +ev.get('venue').address.region)

	@displayWhenWhere(ev) if @event_when_where
	@displaySettings(ev) if @event_settings
	@drawMap(ev) if @map

	if ev.get('public')
		@hideRegForm()
		@displayLinks(ev) if @event_links
		@displayTickets(ev) if @event_tickets
	else
		@hidePublicDetails()
