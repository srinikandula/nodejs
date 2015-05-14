#!/usr/bin/env ruby

require 'json'
require 'csv'

# Bulk uploading of geofences can be done by uploading a CSV file with the following
# columns: name, radius (in meters), latitude, longitude and address (*optional).
# An example is shown below. After uploading, you will be able to preview the places
# before confirming the creation of places.


# read neighborhoodGeo

filename = ARGV[0]


unless filename && File.exists?(filename)
  puts "Usage: #{__FILE__} <neighborhood_data_file.json>"
  exit 1
end


raw_json = ''

File.open(filename) do |f|
 raw_json = f.read
end

output_filename = 'nyc_neighborhoods.csv'

neighborhoods = JSON.parse(raw_json)
neighborhoods.each_with_index do |n, n_idx|
  # break if n_idx > 2
  next unless n && n['geometry']
  coordinates = n['geometry']['coordinates'] || []
  csv_string = CSV.generate do |csv|
    coordinates.each do |polygon|
      name = "#{n['name']}"
      address = ''
      row = [name, address]
      polygon.each do |lonlat|
        lon = lonlat[0].to_f
        lat = lonlat[1].to_f
        row += [lat, lon]
      end
      csv << row
    end
  end

  File.open(output_filename, 'a') { |f| f.write(csv_string) }

end

puts "saved csv file '#{output_filename}'\n\n"





