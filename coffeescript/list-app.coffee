EventListApp = new Marionette.Application
	regions:
		application: '.main-content'


# ##     ## #### ######## ##      ##  ######
# ##     ##  ##  ##       ##  ##  ## ##    ##
# ##     ##  ##  ##       ##  ##  ## ##
# ##     ##  ##  ######   ##  ##  ##  ######
#  ##   ##   ##  ##       ##  ##  ##       ##
#   ## ##    ##  ##       ##  ##  ## ##    ##
#    ###    #### ########  ###  ###   ######


EventView = Marionette.ItemView.extend
	className: 'eventbrite-event'
	template: (attributes) -> # needs to be a closure, the ops don't exist until the app is run
		_.template(EventListApp.ops.evi_event_template)(attributes)

ThirdColumnView = Marionette.CollectionView.extend
	className: 'vc_col-sm-4 wpb_column column_container col no-extra-padding'
	childView: EventView


# ##          ###    ##    ##  #######  ##     ## ########  ######
# ##         ## ##    ##  ##  ##     ## ##     ##    ##    ##    ##
# ##        ##   ##    ####   ##     ## ##     ##    ##    ##
# ##       ##     ##    ##    ##     ## ##     ##    ##     ######
# ##       #########    ##    ##     ## ##     ##    ##          ##
# ##       ##     ##    ##    ##     ## ##     ##    ##    ##    ##
# ######## ##     ##    ##     #######   #######     ##     ######

ColumnLayout = Marionette.LayoutView.extend
	className: 'vc_row-fluid'
	regions:
		column1: '#column1'
		column2: '#column2'
		column3: '#column3'
	template: _.template('')

	_mapping:
		'3': ThirdColumnView

	onRender: ->
		self = this
		columnView = @_mapping[@getOption('column_count')]
		_.each @getOption('columns'), (group,i) ->
			self.$el.append (new columnView
				collection: new Events(group, EventListApp.ops)).render().el

CategoryLayout = Marionette.LayoutView.extend
	template: _.template ''
	onRender: ->
		self = this
		_.each @getOption('categories'), (group,category) ->
			self.$el.append "<div class='vc_row-fluid'><div class='vc_span12 col'><h4 class='eventbrite-category-title'>" + category + "</h4></div></div>", (new ColumnLayout column_count: 3, columns: _.groupBy group, (event,i) ->
					parseInt(i / Math.ceil(group.length / 3))
				).render().el

MapLayout = Marionette.LayoutView.extend
	template: _.template ''
	className: 'eventbrite-list-map row'
	markers: []

	onRender: ->

		self = this

		if _.isUndefined(@map)
			@map = new google.maps.Map EventListApp.map.el,
				zoom: 4
				center: new google.maps.LatLng(37.09024, -95.712891);
				scrollwheel: EventListApp.ops.evi_enable_scroll_wheel
				mapTypeControlOptions:
					mapTypeIds: [ google.maps.MapTypeId.ROADMAP, 'map_style']

			unless _.isEmpty(EventListApp.ops.evi_map_style)
				styledMap = new google.maps.StyledMapType JSON.parse(EventListApp.ops.evi_map_style), { name: EventListApp.ops.evi_map_style_name }
				@map.mapTypes.set 'map_style', styledMap
				@map.setMapTypeId 'map_style'

		@_geoLocate()

		@getOption('evnts').each (event) ->
			self.drawMarker new google.maps.LatLng(parseFloat(event.get('venue').latitude), parseFloat(event.get('venue').longitude)), event.get('local_url')

		google.maps.event.addListenerOnce @map, 'tilesloaded', ->
			google.maps.event.addListenerOnce self.map, 'tilesloaded', ->
				google.maps.event.trigger self.map, 'resize'

		google.maps.event.addListenerOnce @map, 'resize', ->
			self._geoLocate()


	drawMarker: (location, url = null) ->

		settings =
			map: @map
			position: location
			animation: google.maps.Animation.DROP

		settings.url = url if url
		settings.icon = EventListApp.ops.evi_marker_icon if EventListApp.ops.evi_marker_icon

		@markers.push (marker = new google.maps.Marker settings)

		google.maps.event.addListener marker, 'click', ->
			window.location.href = @url

	# Method 1 Geolocation API
	_geoLocate: ->
		# Get visitor location
		# https://developer.mozilla.org/en-US/docs/Web/API/Geolocation.getCurrentPosition
		if _.isUndefined(navigator.geolocation.getCurrentPosition)
			@_ipLocate()
		else
			self = this
			if store.get('geolocate:lat') and store.get('geolocate:lng')
				@_setMyLocation store.get('geolocate:lat'), store.get('geolocate:lng'), false
			else
				navigator.geolocation.getCurrentPosition (position) ->
					self._setMyLocation position.coords.latitude, position.coords.longitude
				, (error) -> self._ipLocate()

	# Method 2 IP lookup
	_ipLocate: ->
		# https://ipinfo.io
		EventListApp.$.ajax "http://ipinfo.io" + (if _.isEmpty(EventListApp.ops.evi_ipinfo_token) then "" else "?token=" + EventListApp.ops.evi_ipinfo_token),
			context: this
			success: (location) ->
				lat_lng = location.loc.split(',')
				@_setMyLocation lat_lng[0], lat_lng[1]
			dataType: "jsonp"

	_setMyLocation: (lat, lng, update = true) ->
		if update
			store.set 'geolocate:lat', parseFloat(lat)
			store.set 'geolocate:lng', parseFloat(lng)

		myLocation = new google.maps.LatLng parseFloat(lat), parseFloat(lng)
		@map.setCenter myLocation
		@map.setZoom 6

		if EventListApp.nearby
			evs = new Events EventListApp.events.noSort.sortBy (ev) ->
				### ev.proximity = ###
				# ev.proximity
				google.maps.geometry.spherical.computeDistanceBetween(myLocation, new google.maps.LatLng(ev.get('venue').latitude, ev.get('venue').longitude)) * 0.00062137
			, EventListApp.ops

			EventListApp.nearby.show new CategoryLayout categories: { 'Closest to Furthest': evs.models.slice(0,3) }

		# @drawMarker myLocation

#    ###    ########  ########
#   ## ##   ##     ## ##     ##
#  ##   ##  ##     ## ##     ##
# ##     ## ########  ########
# ######### ##        ##
# ##     ## ##        ##
# ##     ## ##        ##

EventListApp.addInitializer (options) ->

	@ops = options

	r = {}
	for region in ['upcoming', 'alphabetical', 'nearby', 'map']
		r[region] = options['evi_' + region + '_tag_id'] if EventListApp.$(options['evi_' + region + '_tag_id']).length > 0
	@addRegions r

	# filter out events that do not match the organizer id
	@events_raw = _.filter options.events, (ev) ->
		return ev.organizer.id == options.evi_organizer_id and not ev.post_title.match(/cancel/i)

	evs = new Events @events_raw, EventListApp.ops

	@events =
		byDate: new Events evs.sortBy (ev) ->
			ev.get('start').local
		, EventListApp.ops
		byCity: new Events evs.sortBy (ev) ->
			att = ev.attributes
			if options.evi_alphabetical_event_attribute.indexOf('.') > -1
				att = att[v] for v in options.evi_alphabetical_event_attribute.split('.')
				att
			else
				att[options.evi_alphabetical_event_attribute]
		, EventListApp.ops

		noSort: evs

	grouped_byDate = @events['byDate'].groupBy (ev,i) ->
		moment(ev.get('start').local).format("MMMM YYYY")
	@upcoming.show new CategoryLayout categories: grouped_byDate if @upcoming

	grouped_byCity = @events['byCity'].groupBy (ev,i) ->
		att = ev.attributes
		if options.evi_alphabetical_event_attribute.indexOf('.') > -1
			att = att[v] for v in options.evi_alphabetical_event_attribute.split('.')
			att
		else
			att[options.evi_alphabetical_event_attribute]

	@alphabetical.show new CategoryLayout categories: grouped_byCity if @alphabetical

	@map.show new MapLayout evnts: @events['noSort'] if @map


jQuery( document ).on 'load-events', (e, options = {}) ->
	EventListApp.$ = jQuery
	EventListApp.start(options)
