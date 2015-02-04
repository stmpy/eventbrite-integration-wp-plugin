EventApp = new Marionette.Application

EventModel = Backbone.Model.extend
	initialize: (attributes) ->
		start = attributes.start
		mStart = moment(start.local)
		mEnd = moment(attributes.end.local)
		start.formatted = mStart.format('dddd, MMMM Do, YYYY') + ' from ' + mStart.format('h:mm a') + ' to ' + mEnd.format('h:mm a zz')
		@set 'start', start
		if EventApp.ops.evi_event_metro_regex
			expr = new RegExp(EventApp.ops.evi_event_metro_regex);
			match = @get('post_title').match(expr)
			if match? and match[1]?
				@set 'metro', match[1]
			else
				@set 'metro', @get('venue').address.city

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

	onRender: ->
		@$el.children().each (i, e) ->
			($link = EventApp.$(e).find('a')).attr('onclick',"_gaq.push(['_link', '" + $link.attr('href') + "']); return false;")

	childViewOptions: ->
		template: @template

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

EventApp.showRegForm = ->
	EventApp.$('.eventbrite-event-private').each (i, e) ->
		EventApp.$(e).show()

EventApp.showPublicDetails = ->
	EventApp.$('.eventbrite-event-public').each (i,e) ->
		EventApp.$(e).show()

EventApp.displayLinks = (ev) ->
	@event_links.$el.each (i, e) ->
		EventApp.$(e).html (new EventLinks
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
				Handlebars.compile(EventApp.$(e).html())(attributes) + '<br />'
		).render().el

### Settings ###
EventDetails = Marionette.ItemView.extend {}

EventApp.displayTickets = (ev) ->
	@event_tickets.$el.each (i, e) ->
		EventApp.$(e).html (new TicketsView
			collection: new Tickets ev.get('tickets').filter (ticket) ->
				moment().isBetween(moment(ticket.sales_start).subtract(2, 'weeks'),moment(ticket.sales_end), 'day')
			template: (attributes) ->
				Handlebars.compile(EventApp.$(e).html())(attributes) + '<br />'
		).render().el

EventApp.displayWhenWhere = (ev) ->
	@event_when_where.$el.each (i, e) ->
		EventApp.$(e).html (new EventView
			model: ev
			template: (attributes) ->
				Handlebars.compile(EventApp.$(e).html())(attributes)
		).render().el

EventApp.displaySettings = (ev) ->
	@event_settings.$el.each (i, e) ->
		EventApp.$(e).html (new EventDetails
			model: ev
			template: (attributes) ->
				Handlebars.compile(EventApp.$(e).html())(attributes)
		).render().el

EventApp.drawMap = (ev) ->
	location = new google.maps.LatLng(ev.get('venue').latitude, ev.get('venue').longitude)
	@map.$el.each (i, e) ->
		map = new google.maps.Map e,
			zoom: 11
			center: location
			scrollwheel: EventApp.ops.evi_enable_scroll_wheel
			mapTypeControlOptions:
				mapTypeIds: [ google.maps.MapTypeId.ROADMAP, 'map_style']

		unless _.isEmpty(EventApp.ops.evi_map_style)
			styledMap = new google.maps.StyledMapType JSON.parse(EventApp.ops.evi_map_style), { name: EventApp.ops.evi_map_style_name }
			map.mapTypes.set 'map_style', styledMap
			map.setMapTypeId 'map_style'

		settings =
			map: map
			position: location
			animation: google.maps.Animation.DROP

		settings.icon = EventApp.ops.evi_marker_icon if EventApp.ops.evi_marker_icon

		new google.maps.Marker settings

EventApp.addInitializer (options) ->

	@ops = options
	r = {}
	for region in ['event_links', 'event_tickets', 'event_when_where', 'map', 'event_settings']
		r[region] = options['evi_' + region + '_tag_id'] if EventApp.$(options['evi_' + region + '_tag_id']).length > 0
	@addRegions r

	ev = new EventModel options.event

	if _.isEmpty(options.event.ID)
		EventApp.$('.subheader').html("").prev().html("")
		if confirm "Unable to Find event, click 'OK' to view all locations,\n click 'CANCEL' to refresh the page."
			window.location.replace '/locations'
		else
			window.location.reload()

		return

	# Set header for event
	EventApp.$('.subheader').html(moment(ev.get('start').local).format('MMMM Do, YYYY')).prev().html(ev.get('metro'))

	@displayWhenWhere(ev) if @event_when_where
	@displaySettings(ev) if @event_settings
	@drawMap(ev) if @map

	if ev.get('public')
		@showPublicDetails()
		@displayLinks(ev) if @event_links
		@displayTickets(ev) if @event_tickets
	else
		@showRegForm()

jQuery( document ).on 'load-event', (e, options = {}) ->
	EventApp.$ = jQuery
	EventApp.start(options)
