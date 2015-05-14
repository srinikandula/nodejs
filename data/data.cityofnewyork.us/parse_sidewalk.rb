#!/usr/bin/env ruby

require 'JSON'

def usage
  puts "#{__FILE__} [json_file] [category_id] [category_type_id] [category_subtype_id]\n"
  puts "This will create a new file named <json_file>.exported.json which can be imported via"
  puts "    mongoimport -d <db> ..... --upsert <json_file>.exported.json\n"
end

if ARGV[0] =~ /help/i || ARGV.length > 4
  usage
  exit 0
end

json_file = ARGV[0] || 'sidewalk_cafes.json'
category_id = ARGV[1] || '5354ca6180e4b802000964cd'  # production ishiki
category_type_id = ARGV[2] || '5354ca7d80e4b802000964d0'  # production ishiki
category_subtype_id = ARGV[3] || '538dc25d962bc80200579666'   # production ishiki

# localhost values: 
# 538dc07962562fd97dea9343
#category_id = ARGV[1] || '5352f7660be2c70e5a8f5834'  # localhost ishiki
#category_type_id = ARGV[1] || '53548d3c8b1ed93c9866eaff'  # localhost ishiki
#category_subtype_id = ARGV[1] || '538dc07962562fd97dea9343'   # localhost ishiki


puts "Attempting to generate JSON from '#{json_file}'"

unless File.exists? json_file
  puts "ERROR.  Could not find file '#{json_file}\n"
  usage
  exit 1
end


poi_list = []

all_data = nil

File.open(json_file, 'r') { |f| all_data = JSON.parse(f.read) }

# puts "all_data is: \n#{all_data[data]}"

# 1.9.3-p545 :016 > all_data['data'][101]
 # => [102, "BE71719E-F3AC-4E32-B1BD-A3597095332E", 102, 1318030459, "392904", 1318030489, "392904", "{\n}", "SIDEWALK CAFE", "935481", "Unenclosed", "180", "MICHAEL KING INC.", nil, "1 AVENUE", "1361 1 AVENUE", "GR.FL", "10021", "2127373664", ["{\"address\":\"1361 1 AVENUE\",\"city\":\"NEW YORK\",\"state\":\"NY\",\"zip\":\"10021\"}", "40.76860835648455", "-73.95542079251555", nil, false]]

 # "loc": {
   # "type": "Point",
   # "coordinates": [
     # 23.432432099999999764,
     # -11.432100000000000151
   # ]
 # },

all_data['data'].each do |raw_poi|
  lat = raw_poi[19][1].to_f rescue nil
  long = raw_poi[19][2].to_f rescue nil
  user_friendly_data = JSON.parse(raw_poi[19][0])
  poi = {
    :name => raw_poi[13] || raw_poi[12] || '',
    :addr1 => user_friendly_data['address'] || '', #raw_poi[15] || '',
    :city => 'New York',
    :state => 'NY',
    :zip => user_friendly_data['zip'] || '', #raw_poi[17] || '',
    :phone => raw_poi[18] || '',
    # :description1 => '',
    # :description2 => '',
    # :costDesc => '',
    # :rating => '',
    :categoryId => category_id,
    :categoryTypeId => category_type_id,
    :categorySubTypeId => category_subtype_id,
    :import_src => 'data.cityofnewyork.us-sidewalk-cafes'
  }
  if lat && long && lat != 0 && long != 0
    poi[:loc] = {
      :type => 'Point',
      :coordinates => [long, lat]
    }
  end
  poi_list << poi
end

poi_json = poi_list.map(&:to_json).join("\n")
output_file = json_file + '.exported.json'
puts "saving json to file: #{output_file}"
File.open(output_file, 'w') { |f| f.write(poi_json)}

puts "done.\n"


